
from utils import get_jwt_access, get_users

def test_pytest_available():
    assert True


async def test_jwt_access():
    jwt = await get_jwt_access()

    assert jwt


async def test_users():
    jwt = await get_jwt_access()
    users = await get_users(jwt['access_token'])
    assert users

    print(users)

    assert users.ids == [1, 2]
    assert users.pagination.page == 0
    assert users.pagination.size == 5


async def test_users_without_auth():
    users = await get_users()
    assert users
