import { svgPathProperties } from "svg-path-properties"
function getPoints(boarderResolution:number, path:string):number[]{
    const polygon:number[] = []
    if (boarderResolution && path){
        for (let i = 0; i < boarderResolution; i++) {
            const properties = new svgPathProperties(path)
            const pathLength = properties.getTotalLength()
            const perc = Math.round((i * pathLength)/boarderResolution)
            const {x,y} = properties.getPointAtLength(perc)
            polygon.push(x,y)
        }
    }
    return polygon
}
export default getPoints