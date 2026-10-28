"""Testa o cadastro de medicamentos e de vacinas — spec: specs/medicamentos-vacinas.md."""

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
    monkeypatch.setenv("SAFEPASS_DB", str(tmp_path / "test.db"))


def _dependente(cliente, nome="Pedro"):
    return cliente.post("/api/dependentes", json={"nome": nome, "parentesco": "Filho"}).json()


def _medicamento(cliente, **campos):
    return cliente.post("/api/medications", json={
        "medicamento": "Losartana", "dose": "50mg", "posologia": "1x ao dia", "duracao_dias": None, **campos,
    })


def _receita(cliente, nome, data_receita, periodo):
    return cliente.post("/api/prescriptions", json={
        "medico": None,
        "data_receita": data_receita,
        "medicamentos": [{"medicamento": nome, "dose": "500mg", "posologia": "12/12h", "periodo": periodo}],
    })


def _vacina(cliente, **campos):
    return cliente.post("/api/vacinas", json={"nome": "Hepatite B", "dose": "1ª dose", "data_aplicacao": _dia(-30), **campos})


def _lembretes(cliente):
    return [(l["tipo"], l["medicamento"], l["horario"], l["data"]) for l in cliente.get("/api/reminders").json()]


def test_manual_medication_for_dependent_ac1():
    pedro = _dependente(ana)

    criado = _medicamento(ana, dependente_id=pedro["id"])

    assert criado.status_code == 201
    [med] = ana.get("/api/medications").json()
    assert (med["id"], med["origem"], med["dependente_id"], med["ativo"]) == (criado.json()["id"], "manual", pedro["id"], True)
    assert (med["inicio"], med["horarios"]) == (_dia(), ["08:00"])


def test_finish_and_edit_manual_medication_ac2():
    med_id = _medicamento(ana).json()["id"]

    assert ana.patch(f"/api/medications/{med_id}", json={"posologia": "2x ao dia"}).json()["horarios"] == ["08:00", "20:00"]
    assert len(_lembretes(ana)) == 2

    encerrado = ana.patch(f"/api/medications/{med_id}", json={"encerrado_em": _dia()}).json()

    assert (encerrado["encerrado_em"], encerrado["ativo"]) == (_dia(), False)
    assert _lembretes(ana) == []


def test_prescription_medication_expires_after_period_ac3():
    _receita(ana, "Amoxicilina", _dia(-10), "5 dias")
    _receita(ana, "Dipirona", _dia(), "5 dias")

    assert {(m["medicamento"], m["origem"], m["duracao_dias"], m["ativo"]) for m in ana.get("/api/medications").json()} == {
        ("Amoxicilina", "receita", 5, False),
        ("Dipirona", "receita", 5, True),
    }
    assert _lembretes(ana) == [("medicamento", "Dipirona", "08:00", None), ("medicamento", "Dipirona", "20:00", None)]


def test_continuous_and_future_medications_ac4():
    _medicamento(ana, medicamento="Contínuo", inicio=_dia(-400))
    _medicamento(ana, medicamento="Futuro", inicio=_dia(3), duracao_dias=7)

    assert {m["medicamento"]: m["ativo"] for m in ana.get("/api/medications").json()} == {"Contínuo": True, "Futuro": False}


def test_lists_vaccines_by_owner_ac5():
    pedro = _dependente(ana)
    da_ana = _vacina(ana, nome="Febre amarela").json()
    _vacina(ana, nome="BCG", dependente_id=pedro["id"])

    assert [v["nome"] for v in ana.get("/api/vacinas").json()] == ["BCG", "Febre amarela"]  # mais recente primeiro
    assert [v["nome"] for v in ana.get("/api/vacinas", params={"dependente_id": pedro["id"]}).json()] == ["BCG"]
    assert ana.get(f"/api/vacinas/{da_ana['id']}").json()["dose"] == "1ª dose"
    assert bruno.get(f"/api/vacinas/{da_ana['id']}").status_code == 404
    assert bruno.get("/api/vacinas").json() == []


def test_next_vaccine_dose_becomes_reminder_until_registered_ac6():
    pedro = _dependente(ana)
    _vacina(ana, dependente_id=pedro["id"], proxima_dose=_dia(5))
    _vacina(ana, nome="Influenza")  # sem próxima dose

    [lembrete] = ana.get("/api/reminders").json()
    assert (lembrete["tipo"], lembrete["medicamento"], lembrete["horario"], lembrete["data"]) == ("vacina", "Hepatite B", None, _dia(5))
    assert lembrete["dependente_id"] == pedro["id"]

    _vacina(ana, dose="2ª dose", data_aplicacao=_dia(), dependente_id=pedro["id"])

    assert _lembretes(ana) == []


def test_only_shared_vaccines_reach_assistant_ac7():
    compartilhada = _vacina(ana, nome="Febre amarela").json()
    _vacina(ana, nome="Raiva")
    ana.patch(f"/api/vacinas/{compartilhada['id']}", json={"compartilhado_assistente": True})

    resposta = ana.get("/api/assistente/contexto")

    assert [v["nome"] for v in resposta.json()["vacinas"]] == ["Febre amarela"]
    assert "Raiva" not in resposta.text


def test_vaccine_survives_deleting_its_document_ac8():
    documento = ana.post(
        "/api/documentos",
        data={"tipo": "vacina", "titulo": "Carteira de vacinação"},
        files={"arquivo": ("c.pdf", b"%PDF-1.7 carteira", "application/pdf")},
    ).json()
    vacina = _vacina(ana, documento_id=documento["id"]).json()

    ana.delete(f"/api/documentos/{documento['id']}")

    assert ana.get(f"/api/vacinas/{vacina['id']}").json()["documento_id"] is None


def test_rejects_other_users_dependent_or_document_ec1():
    dependente_do_bruno = _dependente(bruno)
    documento_do_bruno = bruno.post(
        "/api/documentos",
        data={"tipo": "vacina", "titulo": "Carteira"},
        files={"arquivo": ("c.pdf", b"%PDF-1.7 x", "application/pdf")},
    ).json()

    assert _medicamento(ana, dependente_id=dependente_do_bruno["id"]).status_code == 404
    assert _vacina(ana, dependente_id=dependente_do_bruno["id"]).status_code == 404
    assert _vacina(ana, documento_id=documento_do_bruno["id"]).status_code == 404
    assert ana.get("/api/medications").json() == [] and ana.get("/api/vacinas").json() == []


def test_patch_other_users_medication_ec2():
    med_id = _medicamento(ana).json()["id"]

    assert bruno.patch(f"/api/medications/{med_id}", json={"encerrado_em": _dia()}).status_code == 404
    assert ana.patch("/api/medications/999", json={"dose": "1"}).status_code == 404
    assert ana.get("/api/medications").json()[0]["ativo"] is True


def test_validates_fields_ec3():
    assert _medicamento(ana, medicamento=" ").status_code == 422
    assert _medicamento(ana, duracao_dias=0).status_code == 422
    assert _vacina(ana, nome="").status_code == 422


def test_cannot_delete_dependent_with_medication_or_vaccine_ec4():
    pedro = _dependente(ana)
    maria = _dependente(ana, nome="Maria")
    _medicamento(ana, dependente_id=pedro["id"])
    _vacina(ana, dependente_id=maria["id"])

    assert ana.delete(f"/api/dependentes/{pedro['id']}").status_code == 409
    assert ana.delete(f"/api/dependentes/{maria['id']}").status_code == 409
