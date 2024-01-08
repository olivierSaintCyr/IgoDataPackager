
export const generateUrlFromTemplate = (templateUrl: string, x: number, y: number, z: number) => {
    const url = `${templateUrl}`
        .replace('{x}', x.toString())
        .replace('{y}', y.toString())
        .replace('{-y}', (-y).toString())
        .replace('{z}', z.toString());
    return url;
};
