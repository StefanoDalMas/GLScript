class LocationsSet {
    constructor() {
        this.global.parcelLocations = {}
    }

    _hash(x, y) {
        return ((x.toString() + "-" + y.toString()))
    }

    add(x, y) {
        const hash = this._hash(x, y)
        this.global.parcelLocations[hash] = true
    }
    has(x, y) {
        const hash = this._hash(x, y)
        return this.global.parcelLocations[hash] === true;
    }
    delete(x, y) {
        const hash = this._hash(x, y)
        this.global.parcelLocations[hash] = false
    }
    keys() {
        return Object.keys(this.global.parcelLocations)
    }
    values() {
        return Object.values(this.global.parcelLocations)
    }
    items() {
        return Object.entries(this.global.parcelLocations)
    }
}

String.prototype.hashCode = function () {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

export default LocationsSet;