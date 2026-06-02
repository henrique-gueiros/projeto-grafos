"""
viz.py — ponto de entrada para todas as visualizações do projeto.

Delega para src.analise_visual, que contém a implementação completa
dos Requisitos 7–10 (matplotlib, pyvis, AVD).
"""

from src.analise_visual import (  # noqa: F401
    run_all_visualizations,
    gerar_grafo_interativo,
    gerar_analise_avd,
)
