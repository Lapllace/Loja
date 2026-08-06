from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "backend" / "src"

folders = [
    "common",
    "common/decorators",
    "common/dto",
    "common/enums",
    "common/exceptions",
    "common/filters",
    "common/guards",
    "common/interceptors",
    "common/interfaces",
    "common/pipes",
    "common/utils",

    "config",
    "database",

    "modules",

    "modules/auth",
    "modules/users",
    "modules/products",
    "modules/categories",
    "modules/brands",
    "modules/customers",
    "modules/orders",
    "modules/stock",
    "modules/payments",
    "modules/dashboard",
    "modules/settings",
]

module_names = [
    "auth",
    "users",
    "products",
    "categories",
    "brands",
    "customers",
    "orders",
    "stock",
    "payments",
    "dashboard",
    "settings",
]

print("=" * 60)
print("Organizando src...")
print("=" * 60)

for folder in folders:
    (SRC / folder).mkdir(parents=True, exist_ok=True)

for module in module_names:
    base = SRC / "modules" / module

    for sub in [
        "controllers",
        "services",
        "dto",
        "entities",
        "repositories",
    ]:
        (base / sub).mkdir(exist_ok=True)

print("")

print("Estrutura criada com sucesso!")

print(SRC)