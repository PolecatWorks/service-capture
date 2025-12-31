import aiohttp

from pydantic import BaseModel


async def get_jwt_access():
    url = "http://keycloak.k8s/auth/realms/dev/protocol/openid-connect/token"
    data = {
        "grant_type": "password",
        "username": "johnsnow",
        "password": "johnsnowpw",
        "client_id": "app-ui"
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data) as response:
            assert response.status == 200
            return await response.json()


class Pagination(BaseModel):
    page: int
    size: int

class Users(BaseModel):
    ids: list[int]
    pagination: Pagination


async def get_users(access_token: str | None = None) -> Users | str:
    url = "http://dev.k8s/capture/users"
    headers = {}

    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    print(f"Headers: {headers}")

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                return Users(**await response.json())
            return f"Error {response.status}: {await response.text()}"
