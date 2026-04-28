"""
Generate two ZScaler-style sample log files:
  - normal.log           : benign traffic
  - with_anomalies.log   : benign traffic + planted threats to test detection

Format matches the parser in backend/app/parser.py.
"""
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

USERS = ["alice.chen", "bob.smith", "carol.diaz", "david.kim", "erin.lopez",
         "frank.wu", "grace.patel", "henry.ng", "ivy.zhang", "jack.ohara"]

IP_POOL = [f"10.0.2.{i}" for i in range(10, 50)]
USER_IP = {u: random.choice(IP_POOL) for u in USERS}

BENIGN_SITES = [
    ("google.com", "Search"),
    ("gmail.com", "Email"),
    ("github.com", "Tech"),
    ("stackoverflow.com", "Tech"),
    ("docs.microsoft.com", "Tech"),
    ("cnn.com", "News"),
    ("nytimes.com", "News"),
    ("youtube.com", "Streaming"),
    ("linkedin.com", "Business"),
    ("zoom.us", "Communication"),
    ("slack.com", "Communication"),
    ("atlassian.net", "Business"),
    ("aws.amazon.com", "Cloud"),
    ("cloud.google.com", "Cloud"),
    ("notion.so", "Productivity"),
]

MALICIOUS_SITES = [
    ("evil-malware.ru", "Malware"),
    ("phish-login-bank.xyz", "Phishing"),
    ("c2-server-01.tk", "C2"),
    ("botnet-controller.cc", "Botnet"),
]

EXFIL_HOSTS = ["data-exfil.xyz", "transfer.sh", "anonfiles.com", "pastebin.raw.tk"]


def fmt(ts: datetime, user: str, ip: str, dst: str, bytes_: int,
        status: int, category: str, action: str) -> str:
    return (
        f"{ts.strftime('%Y-%m-%dT%H:%M:%SZ')} "
        f"user={user} src_ip={ip} dst={dst} "
        f"bytes={bytes_} status={status} "
        f"category={category} action={action}"
    )


def benign_event(ts: datetime, user: str) -> str:
    dst, cat = random.choice(BENIGN_SITES)
    bytes_ = random.randint(500, 25000)
    status = random.choices([200, 200, 200, 301, 304], k=1)[0]
    return fmt(ts, user, USER_IP[user], dst, bytes_, status, cat, "Allowed")


def generate_normal(path: Path, n_events: int = 400):
    lines = []
    start = datetime(2026, 4, 22, 8, 0, 0)
    for i in range(n_events):
        ts = start + timedelta(seconds=random.randint(0, 28800))  # 8 hours
        user = random.choice(USERS)
        lines.append(benign_event(ts, user))
    lines.sort()  # chronological
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {len(lines)} lines to {path}")


def generate_with_anomalies(path: Path, n_normal: int = 500):
    lines = []
    start = datetime(2026, 4, 22, 8, 0, 0)

    # Normal traffic spread over the day
    for _ in range(n_normal):
        ts = start + timedelta(seconds=random.randint(0, 36000))
        user = random.choice(USERS)
        lines.append(benign_event(ts, user))

    # -------- Anomaly #1: malware/phishing blocks for alice.chen at ~14:02 --------
    attack_start = datetime(2026, 4, 22, 14, 2, 0)
    for i in range(6):
        dst, cat = random.choice(MALICIOUS_SITES)
        ts = attack_start + timedelta(seconds=i * 3)
        lines.append(fmt(ts, "alice.chen", USER_IP["alice.chen"],
                         dst, random.randint(2000, 8000), 200, cat, "Blocked"))

    # -------- Anomaly #2: request-rate burst from alice.chen --------
    burst_start = datetime(2026, 4, 22, 14, 5, 0)
    for i in range(250):  # 250 extra requests in ~5 min from one user = huge spike
        ts = burst_start + timedelta(seconds=i)
        dst, cat = random.choice(BENIGN_SITES)
        lines.append(fmt(ts, "alice.chen", USER_IP["alice.chen"],
                         dst, random.randint(500, 5000), 200, cat, "Allowed"))

    # -------- Anomaly #3: large data exfiltration (single giant request) --------
    exfil_ts = datetime(2026, 4, 22, 14, 12, 30)
    lines.append(fmt(exfil_ts, "alice.chen", USER_IP["alice.chen"],
                     random.choice(EXFIL_HOSTS), 9_800_000, 200,
                     "Uncategorized", "Allowed"))

    # -------- Anomaly #4: server errors hinting at scanning from bob.smith --------
    scan_start = datetime(2026, 4, 22, 3, 15, 0)  # unusual hour
    for i in range(8):
        ts = scan_start + timedelta(seconds=i * 10)
        lines.append(fmt(ts, "bob.smith", USER_IP["bob.smith"],
                         f"internal-api-{i}.corp", random.randint(100, 800),
                         random.choice([500, 502, 503]), "Business", "Allowed"))

    lines.sort()
    path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {len(lines)} lines to {path} (includes ~270 planted anomalies)")


if __name__ == "__main__":
    out = Path(__file__).parent
    generate_normal(out / "normal.log", n_events=400)
    generate_with_anomalies(out / "with_anomalies.log", n_normal=500)
