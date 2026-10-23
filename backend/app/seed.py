import json
import logging
from sqlalchemy.orm import Session
from backend.app.models import PRRecord

logger = logging.getLogger("pr_whisperer.seed")

PR_101_DIFF = """diff --git a/backend/routers/payments.py b/backend/routers/payments.py
new file mode 100644
index 0000000..8a91b2c
--- /dev/null
+++ b/backend/routers/payments.py
@@ -1,45 +1,45 @@
+import os
+import stripe
+from fastapi import APIRouter, HTTPException, Depends
+from sqlalchemy.orm import Session
+from backend.database import get_db
+
+router = APIRouter(prefix="/api/v1/payments", tags=["payments"])
+
+# Configure payment provider client
+stripe.api_key = "sk_live_DEMO_MOCK_STRIPE_KEY_TESTING_ONLY"  # Hardcoded live key!
+
+@router.post("/charge")
+def create_customer_charge(amount: int, user_id: str, db: Session = Depends(get_db)):
+    \"\"\"Process credit card charge for customer.\"\"\"
+    if amount <= 0:
+        raise HTTPException(status_code=400, detail="Invalid amount")
+    
+    try:
+        charge = stripe.Charge.create(
+            amount=amount,
+            currency="usd",
+            description=f"Charge for user {user_id}",
+            source="tok_visa",
+        )
+    except Exception as e:
+        raise HTTPException(status_code=502, detail=str(e))
+    
+    # Query customer existing balance
+    sql_query = f"SELECT * FROM charges WHERE user_id = '{user_id}'"
+    records = db.execute(sql_query).fetchall()
+    
+    return {"status": "success", "charge_id": charge.id, "prior_charges": len(records)}
+
+@router.post("/webhook")
+def stripe_webhook(payload: dict):
+    \"\"\"Stripe webhook handler for charge updates.\"\"\"
+    event_type = payload.get("type")
+    return {"received": True, "event": event_type}
diff --git a/backend/schemas/payment.py b/backend/schemas/payment.py
new file mode 100644
index 0000000..f4a1c9e
--- /dev/null
+++ b/backend/schemas/payment.py
@@ -1,15 +1,14 @@
 from pydantic import BaseModel
 
 class PaymentChargeRequest(BaseModel):
     amount: int
     user_id: str
-    currency: str = "usd"
+    # Removed currency field without deprecation window or openapi sync!
 
 class PaymentChargeResponse(BaseModel):
     status: str
     charge_id: str
     prior_charges: int
"""

PR_102_DIFF = """diff --git a/backend/middleware/auth.py b/backend/middleware/auth.py
new file mode 100644
index 0000000..7c3d2e1
--- /dev/null
+++ b/backend/middleware/auth.py
@@ -1,60 +1,60 @@
+import logging
+import jwt
+from fastapi import Request, HTTPException
+from starlette.middleware.base import BaseHTTPMiddleware
+
+logger = logging.getLogger("auth.middleware")
+JWT_SECRET = "super-secret-key-12345"
+
+class AuthSessionMiddleware(BaseHTTPMiddleware):
+    async def dispatch(self, request: Request, call_next):
+        auth_header = request.headers.get("Authorization")
+        
+        if auth_header:
+            # CRITICAL SECURITY LEAK: Logging raw bearer token in plain logs
+            logger.info(f"Incoming authenticated request: Authorization: {auth_header}")
+            
+            try:
+                token = auth_header.replace("Bearer ", "")
+                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
+                request.state.user = payload
+            except jwt.ExpiredSignatureError:
+                # SILENT BUG: Bare exception catches and passes, swallowing auth failure!
+                try:
+                    pass
+                except Exception:
+                    pass
+            except Exception:
+                pass
+        
+        response = await call_next(request)
+        return response
+
+async def refresh_token_endpoint(refresh_token: str):
+    \"\"\"Token refresh route missing rate limiting protection.\"\"\"
+    # BUG: No rate limiting decorator or Redis throttling!
+    new_token = jwt.encode({"sub": "refreshed_user"}, JWT_SECRET, algorithm="HS256")
+    return {"access_token": new_token}
"""

PR_103_DIFF = """diff --git a/backend/services/metrics.py b/backend/services/metrics.py
new file mode 100644
index 0000000..1b2c3d4
--- /dev/null
+++ b/backend/services/metrics.py
@@ -1,55 +1,55 @@
+from sqlalchemy.orm import Session
+from fastapi import APIRouter, Depends
+from backend.database import get_db
+
+router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
+
+@router.get("/team-velocity")
+def calculate_team_velocity(org_id: str, db: Session = Depends(get_db)):
+    \"\"\"Calculates cycle time metrics across repositories.\"\"\"
+    repos = db.execute(f"SELECT id, name FROM repos WHERE org_id = :org_id", {"org_id": org_id}).fetchall()
+    
+    results = []
+    # PERFORMANCE BOTTLENECK: N+1 query loop executed for every repository
+    for repo in repos:
+        repo_id = repo[0]
+        pr_stats = db.execute(
+            "SELECT count(*), avg(cycle_time) FROM pull_requests WHERE repo_id = :repo_id",
+            {"repo_id": repo_id}
+        ).fetchone()
+        results.append({
+            "repo": repo[1],
+            "pr_count": pr_stats[0],
+            "avg_cycle_time": pr_stats[1]
+        })
+    
+    return {"org_id": org_id, "metrics": results}
+
+@router.get("/history")
+def get_analytics_history(db: Session = Depends(get_db)):
+    \"\"\"Returns historical analytics events - MISSING PAGINATION!\"\"\"
+    # BUG: Lacks limit and offset parameters; returns all 100,000 records
+    events = db.execute("SELECT * FROM analytics_events").fetchall()
+    return {"events": [dict(e) for e in events]}
"""

SEED_PRS = [
     {
         "id": "PR-101",
         "pr_number": "101",
         "title": "feat(payments): Add Stripe webhook retry & customer charge endpoint",
         "repo_name": "acme-corp/payment-service",
         "author": "autonomous-ai-bot",
         "branch_name": "feat/stripe-checkout",
         "branch_source": "feat/stripe-checkout",
         "branch_target": "main",
         "status": "OPEN",
         "diff_text": PR_101_DIFF,
         "files_changed_json": json.dumps(["backend/routers/payments.py", "backend/schemas/payment.py"]),
         "sample_voice_prompt": (
             "Looking at payments.py around line 14, we left a hardcoded Stripe live secret in the file—move that to environment variables immediately. "
             "Also on line 38, you're interpolating user_id directly into raw SQL which opens a SQL injection hole; parameterize that query. "
             "Finally, in payment.py schema, dropping the currency field breaks our OpenAPI v1 contract, and we need a unit test for duplicate webhook signatures."
         ),
     },
     {
         "id": "PR-102",
         "pr_number": "102",
         "title": "refactor(auth): Async session middleware & JWT token refresh",
         "repo_name": "acme-corp/core-auth",
         "author": "devin-assistant",
         "branch_name": "refactor/auth-middleware",
         "branch_source": "refactor/auth-middleware",
         "branch_target": "main",
         "status": "OPEN",
         "diff_text": PR_102_DIFF,
         "files_changed_json": json.dumps(["backend/middleware/auth.py"]),
         "sample_voice_prompt": (
             "In middleware/auth.py line 27, never log the raw Authorization bearer header—redact sensitive tokens before logging. "
             "Down on line 52, catching a bare Exception and passing silently will hide expired token attacks; raise an HTTP 401 instead. "
             "Also add rate limiting on the token refresh endpoint."
         ),
     },
     {
         "id": "PR-103",
         "pr_number": "103",
         "title": "feat(analytics): Real-time team velocity & PR cycle time dashboard",
         "repo_name": "acme-corp/insights-hub",
         "author": "copilot-workspace",
         "branch_name": "feat/velocity-dashboard",
         "branch_source": "feat/velocity-dashboard",
         "branch_target": "main",
         "status": "OPEN",
         "diff_text": PR_103_DIFF,
         "files_changed_json": json.dumps(["backend/services/metrics.py"]),
         "sample_voice_prompt": (
             "In services/metrics.py line 44, we are querying the database inside a for-loop which causes a massive N+1 performance bottleneck on large orgs—batch that into a single SQL IN query. "
             "Also add limit and offset pagination to the history endpoint so large payloads don't timeout."
         ),
     },
]


def seed_database(db: Session) -> None:
    """Populates database with 3 realistic pre-seeded PRs if empty."""
    existing_count = db.query(PRRecord).count()
    if existing_count > 0:
        logger.info("Database already contains %d pull requests. Skipping seed.", existing_count)
        return

    logger.info("Seeding database with %d realistic 'Bad AI PRs' for judge testing...", len(SEED_PRS))
    for data in SEED_PRS:
        pr = PRRecord(
            id=data["id"],
            pr_number=data["pr_number"],
            title=data["title"],
            repo_name=data["repo_name"],
            author=data["author"],
            branch_name=data["branch_name"],
            branch_source=data["branch_source"],
            branch_target=data["branch_target"],
            status=data["status"],
            diff_text=data["diff_text"],
            files_changed_json=data["files_changed_json"],
            sample_voice_prompt=data["sample_voice_prompt"],
        )
        db.add(pr)
    db.commit()
    logger.info("Database seeding successfully completed.")
