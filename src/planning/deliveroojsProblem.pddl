(define (problem deliverooProblem) 
    (:domain deliveroo_js)
    (:objects tile1 - Tile tile2 - Tile)

    (:init
        (at tile1) (left_of tile2 tile1)
    )

    (:goal (and
        (at tile2) (not (at tile1))
))
)


; output is 
; (move_left tile1 tile2)