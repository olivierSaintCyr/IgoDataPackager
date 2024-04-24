import { MultiPolygon, Polygon } from 'geojson';
import { PolygonPreprocessingArgs } from './polygon-preprocessor-args.interface';
import simplify from '@turf/simplify';
import buffer from '@turf/buffer';
import fs from 'fs';

export class PolygonPreprocessor {
    constructor(private args: PolygonPreprocessingArgs) { }

    private getBufferOptions() {
        if (!this.args.buffer) {
            return { radius: undefined, units: undefined, steps: undefined }
        }
        return this.args.buffer;
    }
    process(polygon: Polygon | MultiPolygon): Polygon | MultiPolygon {


        var date = new Date();

        const dateStr = date.getFullYear().toString() + date.getMonth() + 1 + date.getDate() + date.getHours() + date.getMinutes() + date.getSeconds();
        // TODO CHECK LA LOGIQUE DES IF pour return la bonne geom
        let geometryToProcess = polygon;
        if (this.args.buffer) {
            const { radius, units, steps } = this.getBufferOptions();
            const buffered = buffer(polygon, radius, { units, steps });
            geometryToProcess = buffered.geometry;
        }

        if (!this.args.simplify) {
            fs.writeFileSync(dateStr + '_buff.geojson', JSON.stringify(geometryToProcess));
            return geometryToProcess;

        }

        const simplified = simplify(geometryToProcess, this.args.simplify);
        fs.writeFileSync(dateStr + '_buff_simpl.geojson', JSON.stringify(simplified));


        return simplified;
    }
}
