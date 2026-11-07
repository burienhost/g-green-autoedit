# G-Green AutoEdit local engine — prototype v1

This is an **unvalidated engineering prototype**, not yet approved for customer delivery. It processes JPEG, PNG and TIFF with conventional algorithms; **NEF/RAW, ICC profile preservation, metadata preservation, face masking, colour-managed exports, preview approval, and quality-based rejection are not implemented**. Output quality must be reviewed.

## Setup (Windows)
Install Python 3.11 or 3.12, then in PowerShell:

```powershell
cd engine
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe autoedit.py --pull "E:\\GGreen\\Pull" --push "E:\\GGreen\\Push"
```

Add `--watch` to keep monitoring for new files. Pull and Push must exist as separate, non-nested folders; Push is created if missing. **Back up originals and inspect outputs before client delivery.** This prototype does not connect to the Afrihost dashboard. Run only after testing with sample copies, not irreplaceable originals.

The job database lives in Push/.autoedit-jobs.sqlite3. Re-running skips unchanged successful inputs, and retries failures. Output writes are verified and atomically renamed. There is no automatic cleanup of originals.
