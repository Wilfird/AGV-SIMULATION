# astar.py
def astar(grid, start, goal):
    rows, cols = len(grid), len(grid[0])

    def heuristic(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    start_t = tuple(start)
    goal_t = tuple(goal)

    open_set = {start_t}
    came_from = {}
    g_score = {start_t: 0}
    f_score = {start_t: heuristic(start, goal)}

    while open_set:
        current = min(open_set, key=lambda x: f_score.get(x, float('inf')))

        if current == goal_t:
            return reconstruct_path(came_from, current)

        open_set.remove(current)
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            nr, nc = current[0] + dr, current[1] + dc
            neighbor = (nr, nc)

            if nr < 0 or nr >= rows or nc < 0 or nc >= cols:
                continue
            if grid[nr][nc] == 1:
                continue

            tentative_g = g_score[current] + 1
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
                open_set.add(neighbor)

    return []

def reconstruct_path(came_from, current):
    path = [list(current)]
    while current in came_from:
        current = came_from[current]
        path.append(list(current))
    path.reverse()
    return path
