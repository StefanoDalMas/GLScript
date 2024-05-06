class ParcelLocationsSet{
    constructor(){
        this.parcel_locations = {}
    }

    _hash(x,y){
        return ((x.toString()+ y.toString()))
    }

    add(x,y){
        const hash = this._hash(x,y)
        this.parcel_locations[hash] = true
    }
    has(x,y){
        const hash = this._hash(x,y)
        return this.parcel_locations[hash] === true;
    }
    delete(x,y){
        const hash = this._hash(x,y)
        this.parcel_locations[hash] = false
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

export default ParcelLocationsSet;