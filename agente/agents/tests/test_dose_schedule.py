"""Testa services/prescription/dose_schedule.py — spec: specs/prescription-api.md (FR-12, FR-15, AC-10, EC-5)."""

import pytest

from services.prescription.dose_schedule import horarios


@pytest.mark.parametrize(
    "posologia, esperado",
    [
        ("1 cp 8/8h", ["08:00", "16:00", "00:00"]),
        ("1 comprimido a cada 12 horas", ["08:00", "20:00"]),
        ("tomar de 6 em 6 horas", ["08:00", "14:00", "20:00", "02:00"]),
        ("3x ao dia", ["08:00", "16:00", "00:00"]),
        ("duas vezes ao dia", ["08:00", "20:00"]),
        ("1 vez por dia", ["08:00"]),
    ],
)
def test_calcula_horarios_a_partir_da_posologia_fr12(posologia, esperado):
    assert horarios(posologia) == esperado


@pytest.mark.parametrize(
    "posologia, esperado",
    [
        ("1 cp ao dia", ["08:00"]),
        ("1 comprimido por dia", ["08:00"]),
        ("1 comprimido pela manhã", ["08:00"]),
        ("Tomar 01 comprimido pela noite", ["20:00"]),
        ("1 cp à noite", ["20:00"]),
        ("1 cp ao deitar", ["20:00"]),
        ("1 cp pela manhã e 1 à noite", ["08:00", "20:00"]),
        ("1x ao dia à noite", ["20:00"]),
    ],
)
def test_momento_do_dia_e_dose_diaria_unica_viram_horario_fixo_ac10(posologia, esperado):
    assert horarios(posologia) == esperado


@pytest.mark.parametrize(
    "posologia",
    ["", "tomar se necessário", "1 cp 6/6h se dor", "SOS", "a cada 0 horas", "a cada 36 horas", "uso contínuo"],
)
def test_nao_inventa_horario_ec5(posologia):
    assert horarios(posologia) == []
