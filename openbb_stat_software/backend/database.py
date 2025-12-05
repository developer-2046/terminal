from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./terminal.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    balance = Column(Float, default=100000.0)
    
class Holding(Base):
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    symbol = Column(String)
    quantity = Column(Integer)
    avg_price = Column(Float)
    
    # Options fields
    asset_type = Column(String, default="stock") # "stock" or "option"
    option_type = Column(String, nullable=True) # "call" or "put"
    strike = Column(Float, nullable=True)
    expiration = Column(String, nullable=True)

class Watchlist(Base):
    __tablename__ = "watchlists"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String)
    action = Column(String) # buy/sell
    quantity = Column(Integer)
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Options fields
    asset_type = Column(String, default="stock")
    option_type = Column(String, nullable=True)
    strike = Column(Float, nullable=True)
    expiration = Column(String, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Create default portfolio if not exists
    db = SessionLocal()
    if not db.query(Portfolio).first():
        db.add(Portfolio(balance=100000.0))
        # Add default watchlist
        defaults = ["SPY", "AAPL", "NVDA", "TSLA", "AMD"]
        for sym in defaults:
            db.add(Watchlist(symbol=sym))
        db.commit()
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
