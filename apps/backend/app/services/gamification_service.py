from app.db.supabase import rpc

LEVELS = [
    (0, 'starter'),
    (250, 'bronze'),
    (500, 'silver'),
    (1000, 'gold'),
    (2500, 'platinum'),
]


def title_for_xp(xp_points: int) -> str:
    current = LEVELS[0][1]
    for threshold, title in LEVELS:
        if xp_points >= threshold:
            current = title
    return current


def get_leaderboard(limit_count: int = 50):
    return rpc('get_leaderboard', {'limit_count': limit_count})
