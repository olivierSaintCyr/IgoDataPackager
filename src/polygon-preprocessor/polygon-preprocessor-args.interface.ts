import { Units } from '@turf/turf';

export interface PolygonPreprocessingArgs {
    simplify?: {
        tolerance?: number;
        highQuality?: boolean;
        mutable?: boolean;
    };
    buffer?: {
        radius?: number;
        units?: Units;
        steps?: number;
    };
}
