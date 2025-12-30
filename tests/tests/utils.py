import aiohttp

from pydantic import BaseModel
from typing import Optional


async def get_jwt_access():
    url = "http://keycloak.k8s/auth/realms/dev/protocol/openid-connect/token"
    data = {
        "grant_type": "password",
        "username": "johnsnow",
        "password": "johnsnow",
        "client_id": "app-ui"
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data) as response:
            return await response.json()


class Pagination(BaseModel):
    page: int
    size: int

class Users(BaseModel):
    ids: list[int]
    pagination: Pagination




async def get_users(access_token: str|None = None) -> Users:
    url = "http://dev.k8s/capture/users"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            return Users(**await response.json())
