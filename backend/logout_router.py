from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from main import get_token_from_cookie

router = APIRouter()

# OAuth2PasswordBearer is used for token-based authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/logout")
async def logout(token: str = Depends(get_token_from_cookie)):
    # Invalidate the token if necessary (for example, by removing it from a token store)
    # In this case, we just send a response saying the user is logged out.
    return {"message": "Logged out successfully"}
