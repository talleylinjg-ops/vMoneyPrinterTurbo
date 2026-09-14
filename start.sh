#!/bin/bash
# Start MoneyPrinterTurbo hosted web UI and API
cd /workspace
exec python3 -m uvicorn app:app --host 0.0.0.0 --port 8501
