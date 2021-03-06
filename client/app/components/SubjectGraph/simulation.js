import {
    forceSimulation,
    forceX,
    forceY,
    forceManyBody,
    forceLink,
    forceCenter
} from 'd3-force'

export const createSimulation = function(WIDTH, HEIGHT, simulation) {

    return (simulation ? simulation : forceSimulation())
        // .alphaTarget(0.01)
        .alphaDecay(1 - Math.pow(0.001, 1/400))
        .velocityDecay(0.2)
        .force("charge", forceManyBody().strength((node) => {
            // TODO: based on distance to the root collection- 2017-09-19
            // TODO: easier to implement when we have the parent datastructure - 2017-09-19
            // nodes with the same parent should have a separate strength pushing them away from each other
            // different levels should have enough repulsion to visually separate the different layers
            return -400
        }))
        .force("link",
            // TODO: add collision force - 2017-09-19
            forceLink()
                .id(d => d.id)
                .distance((link) => {
                    if (link.type === 'addCollection') {
                        return link.source.radius + 15;
                    }

                    // TODO: based on distance to the root collection- 2017-09-19
                    return link.source.radius + link.target.radius + 40;
                })
            .strength((link) => {
                if (link.type === 'addCollection') {
                    return 1;
                }

                // TODO: based on how many nodes there are in the current "level" - 2017-09-19
                // see https://github.com/d3/d3-force#link_strength
                return 0.4;
            })
        )
        // .force("x", forceX().strength(0.05))
        // .force("y", forceY().strength(0.05))
        // .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
}

export const transformNode = (selection) => {
    return selection
        // .attr("cx", d => d.x)
        // .attr("cy", d => d.y)
            .attr("transform", (d) => {
                return "translate("
                    // + Math.max(minNodeXPos, Math.min(maxNodeXPos, d.x))
                    // + ","
                    // + Math.max(minNodeYPos, Math.min(maxNodeYPos, d.y))
                    + d.x
                    + ","
                    + d.y
                    + ")"
            });
};

export const transformLink = (selection) => {
    // TODO: proper selection here for tick - 2016-06-13
    return selection
        .attr('d', (d) => linkArc(d, d.curved))
};

function linkArc(d, curved=false) {
    /*
     * only arc if there is a two-way link
    */
    // TODO: check adjacencyMap for whether there is an edge the otherway as well - 2017-01-22
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const lineDistance = Math.sqrt(dx * dx + dy * dy);
    const dr = curved ? lineDistance : 0;

    // distance from source node to edge of target node
    // const nodeDistance = lineDistance - d.target.r

    const sourceRadius = d.source.radius
    const targetRadius = d.target.radius

    const ox = (dx * targetRadius) / lineDistance
    const oy = (dy * targetRadius) / lineDistance

    const oxSource = ((dx * sourceRadius) / lineDistance) - 2
    const oySource = ((dy * sourceRadius) / lineDistance) - 2

        // TODO: get node radius here - 2017-01-22
    return "M" + (d.source.x + oxSource) + "," + (d.source.y + oySource) + "A" + dr + "," + dr + " 0 0,1 " + (d.target.x - ox) + "," + (d.target.y - oy);
}

function drawPath(d) {
    const s = d.source
    const t = d.target
    const path = [
        'M', s.x, s.y,
        'L', t.x, t.y,

        // 'L', endShaft, shaftRadius,
        // 'L', endShaft, headRadius,
        // 'L', endArrow, 0,
        // 'L', endShaft, -headRadius,
        // 'L', endShaft, -shaftRadius,
        // 'L', startArrow, -shaftRadius,
        'Z'
    ].join(' ')

    return path
}
