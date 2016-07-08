import { expect } from 'chai';
import { RAD, DEG, TILE_SIZE, MAX_LAT } from '../../geo/mapview';

describe('MapView', () => {
    it('Constants have correct values', () => {
        expect(RAD).to.equal(0.017453292519943295);
        expect(DEG).to.equal(57.29577951308232);
        expect(TILE_SIZE).to.equal(256);
        expect(MAX_LAT).to.equal(85.0511287798066);
    });
});
