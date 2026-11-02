"""Testa início, 1ª dose, encerramento e doses tomadas — spec: specs/notificacoes-medicamentos.md."""

import json
import sqlite3
from datetime import date, timedelta

import pytest

from fastapi.testclient import TestClient

from api.main import app

ana = TestClient(app, headers={"X-Usuario-Id": "ana"})
bruno = TestClient(app, headers={"X-Usuario-Id": "bruno"})


def _dia(delta=0):
    return (date.today() + timedelta(days=delta)).isoformat()


@pytest.fixture(autouse=True)
def db(tmp_path, monkeypatch):
    caminho = tmp_path / "test.db"
    monkeypatch.setenv("SAFEPASS_DB", str(caminho))
    return caminho


def _receita(cliente, data_receita=None, **item):
    return cliente.post("/api/prescriptions", json={
        "medico": None,
        "data_receita": data_receita,
        "medicamentos": [{"medicamento": "Amoxicilina", "dose": "500mg", "posologia": "8/8h", "periodo": "7 dias", **item}],
    })


def _lembretes(cliente):
    return [(l["medicamento"], l["horario"]) for l in cliente.get("/api/reminders").json() if l["tipo"] == "medicamento"]


def _dose(cliente, metodo, ref, horario, data=None):
    return cliente.request(metodo, "/api/doses", json={"ref": ref, "data": data or _dia(), "horario": horario})


def test_first_dose_sets_reminder_times_ac1():
    _receita(ana, inicio=_dia(), primeira_dose="15:00")

    assert _lembretes(ana) == [("Amoxicilina", "15:00"), ("Amoxicilina", "23:00"), ("Amoxicilina", "07:00")]


def test_start_is_the_saved_day_not_the_prescription_date_ac2():
    _receita(ana, data_receita=_dia(-10), periodo="5 dias")

    [med] = ana.get("/api/medications").json()
    assert (med["inicio"], med["primeira_dose"], med["ativo"]) == (_dia(), "08:00", True)


def test_finish_and_reopen_prescription_medication_ac3():
    receita = _receita(ana).json()
    url = f"/api/prescriptions/{receita['id']}/medicamentos/0"

    encerrado = ana.patch(url, json={"encerrado_em": _dia()})

    assert encerrado.status_code == 200
    assert (encerrado.json()["encerrado_em"], encerrado.json()["ativo"]) == (_dia(), False)
    assert _lembretes(ana) == []

    assert ana.patch(url, json={"encerrado_em": None}).json()["ativo"] is True
    assert len(_lembretes(ana)) == 3


def test_taken_dose_marks_only_that_reminder_ac4():
    receita = _receita(ana, primeira_dose="15:00").json()
    ref = f"r{receita['id']}-0"

    assert _dose(ana, "POST", ref, "15:00").status_code == 201
    assert _dose(ana, "POST", ref, "15:00").status_code == 201  # idempotente

    lembretes = ana.get("/api/reminders").json()
    assert [(l["ref"], l["horario"], l["tomada"]) for l in lembretes] == [(ref, "15:00", True), (ref, "23:00", False), (ref, "07:00", False)]

    assert _dose(ana, "DELETE", ref, "15:00").status_code == 204
    assert not any(l["tomada"] for l in ana.get("/api/reminders").json())


def test_doses_are_not_duplicated_ac4(db):
    receita = _receita(ana, primeira_dose="15:00").json()
    for _ in range(2):
        _dose(ana, "POST", f"r{receita['id']}-0", "15:00")

    assert sqlite3.connect(db).execute("SELECT COUNT(*) FROM dose_tomada").fetchone() == (1,)


def test_last_day_of_treatment_ac5():
    _receita(ana, medicamento="Amoxicilina", inicio=_dia(-6), periodo="7 dias")
    _receita(ana, medicamento="Losartana", inicio=_dia(-6), periodo="uso contínuo")

    assert {l["medicamento"]: l["ultimo_dia"] for l in ana.get("/api/reminders").json()} == {"Amoxicilina": True, "Losartana": False}


def test_other_users_ref_and_prescription_are_404_ac6():
    receita = _receita(ana).json()

    assert bruno.patch(f"/api/prescriptions/{receita['id']}/medicamentos/0", json={"encerrado_em": _dia()}).status_code == 404
    assert _dose(bruno, "POST", f"r{receita['id']}-0", "08:00").status_code == 404
    assert _dose(bruno, "DELETE", f"r{receita['id']}-0", "08:00").status_code == 404
    assert _dose(ana, "POST", "m999", "08:00").status_code == 404


def test_manual_medication_first_dose_ac7():
    criado = ana.post("/api/medications", json={"medicamento": "Losartana", "posologia": "12/12h", "primeira_dose": "21:00"}).json()

    assert (criado["ref"], criado["primeira_dose"], criado["horarios"]) == (f"m{criado['id']}", "21:00", ["21:00", "09:00"])
    editado = ana.patch(f"/api/medications/{criado['id']}", json={"primeira_dose": "06:30"}).json()
    assert editado["horarios"] == ["06:30", "18:30"]
    assert [l["ref"] for l in ana.get("/api/reminders").json()] == [criado["ref"]] * 2


@pytest.mark.parametrize("hora", ["7:00", "24:00", "15h", "15:60"])
def test_invalid_first_dose_is_422_ec1(hora):
    assert _receita(ana, primeira_dose=hora).status_code == 422
    assert ana.post("/api/medications", json={"medicamento": "Losartana", "primeira_dose": hora}).status_code == 422


def test_index_outside_prescription_is_404_ec2():
    receita = _receita(ana).json()

    assert ana.patch(f"/api/prescriptions/{receita['id']}/medicamentos/1", json={"encerrado_em": _dia()}).status_code == 404


def test_old_prescription_keeps_old_rule_ec3(db):
    _receita(ana)
    with sqlite3.connect(db) as conn:  # como ficava salva antes desta spec
        conn.execute("UPDATE receitas SET data_receita = ?, medicamentos = ?", (_dia(-2), json.dumps(
            [{"medicamento": "Amoxicilina", "dose": "500mg", "posologia": "8/8h", "periodo": "7 dias"}])))

    [med] = ana.get("/api/medications").json()
    assert (med["inicio"], med["primeira_dose"], med["horarios"]) == (_dia(-2), "08:00", ["08:00", "16:00", "00:00"])


def test_late_dose_uses_the_reminder_date_ec4():
    receita = _receita(ana, inicio=_dia(-1)).json()
    ref = f"r{receita['id']}-0"

    _dose(ana, "POST", ref, "00:00", data=_dia(-1))  # dose de ontem marcada depois da meia-noite

    assert not any(l["tomada"] for l in ana.get("/api/reminders").json())


def test_conditional_and_weekly_posology_do_not_remind_fr12():
    _receita(ana, medicamento="Dipirona", posologia="se necessário")
    _receita(ana, medicamento="Alendronato", posologia="1x por semana")

    assert len(ana.get("/api/medications").json()) == 2
    assert _lembretes(ana) == []
