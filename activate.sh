#!/usr/bin/env bash
# Ativa o ambiente virtual deste projeto.
# Uso: source activate.sh   (não use ./activate.sh)

_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

_VENV="$_ROOT/.venv"
if [[ ! -x "$_VENV/bin/python" ]]; then
  echo "Erro: .venv não encontrada. Crie com:"
  echo "  /opt/homebrew/bin/python3.12 -m venv .venv"
  echo "  source activate.sh"
  echo "  pip install -r requirements.txt"
  return 1 2>/dev/null || exit 1
fi

# shellcheck source=/dev/null
source "$_VENV/bin/activate"
_py_ver="$(python --version 2>&1)"
if [[ "$_py_ver" == Python\ 3.9* ]]; then
  echo "Aviso: Python 3.9 detectado. Use .venv (3.12): source activate.sh"
fi
echo "venv ativa — $_py_ver — $(which python)"
