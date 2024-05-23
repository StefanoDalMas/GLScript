(define (domain deliveroo_js)

    (:requirements :strips :typing :disjunctive-preconditions)
    ; with a - type I can define the type of the object

    (:types
        Tile Parcel
    )

    ; un-comment following line if constants are needed
    ;(:constants )

    (:predicates
        (down_of ?tile1 - Tile ?tile2 - Tile)
        (up_of ?tile1 - Tile ?tile2 - Tile)
        (left_of ?tile1 - Tile ?tile2 - Tile)
        (right_of ?tile1 - Tile ?tile2 - Tile)
        (at ?tile - Tile)
        (parcel_at ?p - Parcel ?tile - Tile)
        (carrying ?p - Parcel)
    )

    ;define actions here
    (:action move_down
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (down_of ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_up
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (up_of ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_left
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and(at ?tile1) (left_of ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action move_right
        :parameters (?tile1 - Tile ?tile2 - Tile)
        :precondition (and (at ?tile1) (right_of ?tile2 ?tile1))
        :effect (and (at ?tile2) (not (at ?tile1)))
    )
    (:action pick_up
        :parameters (?p - Parcel ?tile - Tile)
        :precondition (and (parcel_at ?p ?tile) (at ?tile) (not (carrying ?p)))
        :effect (and (carrying ?p) (not(parcel_at ?p ?tile)))
    )
    (:action put_down
        :parameters (?p - Parcel ?tile - Tile)
        :precondition (and (at ?tile)(carrying ?p))
        :effect (and (parcel_at ?p ?tile) (not(carrying ?p)))
    )
)