from database import engine
from models import User, Base # Import all models here

# Create the database tables
Base.metadata.create_all(bind=engine)