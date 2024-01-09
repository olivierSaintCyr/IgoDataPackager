import { TileSourceOptions } from './datasource-options.interface';
import TileSource from 'ol/source/Tile';
import olSourceXYZ from 'ol/source/XYZ';

export class DataSourceFactory {
    create(options: TileSourceOptions): TileSource {
        const { type } = options;
        switch (type) {
            case 'xyz':
                return new olSourceXYZ(options);
        
            default:
                throw Error('Source type not supported.');
        }
    }
}
