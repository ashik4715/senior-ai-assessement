from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .db import Base, engine
from .api import router
from .config import APP_NOW

app = FastAPI(title="Atri AI L10")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
def health():
    return {"ok": True, "now": APP_NOW.isoformat()}

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
