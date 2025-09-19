from app.core import supabase


def smoke_test() -> None:
    # Attempt a lightweight call to validate connectivity. This does not hit any specific table.
    # If you have a known table, replace with a `.select("*").limit(1)` request.
    print("Supabase REST URL:", getattr(supabase, "rest_url", "<missing>"))


if __name__ == "__main__":
    smoke_test()


