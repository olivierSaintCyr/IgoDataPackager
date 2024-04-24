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

    private bufferizePolygon(polygon: Polygon | MultiPolygon) {
        if (!this.args.buffer) {
            return polygon;
        }

        const { radius, units, steps } = this.args.buffer;
        const buffered = buffer(polygon, radius, { units, steps });
        return buffered.geometry;
    }

    private simplifyPolygon(polygon: Polygon | MultiPolygon) {
        return this.args.simplify ? simplify(polygon, this.args.simplify) : polygon
    }

    private getPolygonFileName() {
        const date = new Date();
        const dateStr = date.getFullYear().toString() + date.getMonth() + 1 + date.getDate() + date.getHours() + date.getMinutes() + date.getSeconds();
        if (this.args.buffer && this.args.simplify) {
            return `${dateStr}_buff_simpl.geojson`;
        }

        if (this.args.buffer) {
            return `${dateStr}_buff.geojson`;
        }

        if (this.args.simplify) {
            return `${dateStr}_simpl.geojson`;
        }
        return `${dateStr}_none.geojson`;
    }

    process(polygon: Polygon | MultiPolygon): Polygon | MultiPolygon {
        const buffered = this.bufferizePolygon(polygon);
        const simplified = this.simplifyPolygon(buffered);

        fs.writeFileSync(this.getPolygonFileName(), JSON.stringify(simplified));
        
        return simplified;
    }
}
