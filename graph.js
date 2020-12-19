const dims = { height: 300, width: 300, radius: 150 };
const cent = { x: (dims.width / 2 + 5), y: (dims.height / 2 + 5) };

const svg = d3.select('.canvas')
    .append('svg')
    .attr('width', dims.width + 150)
    .attr('height', dims.height + 150);

const graph = svg.append('g')
    .attr('transform', `translate(${cent.x}, ${cent.y})`);

const pie = d3.pie()
    .sort(null)
    .value(d => d.cost);

const arcPath = d3.arc()
    .outerRadius(dims.radius)
    .innerRadius(dims.radius / 2);

const color = d3.scaleOrdinal(d3['schemeSet3']);

// Legend Group
const legendGroup = svg.append('g')
    .attr('transform', `translate(${dims.width + 40}, 10)`);

const legend = d3.legendColor()
    .shape('circle')
    .shapePadding(10)
    .scale(color);

// const tip = d3.tip()
//     .attr('class', 'tip card')
//     .html(d => {
//         return `<p>Yooo!</p>`
//     });

const tip = d3
    .select('body')
    .append('div')
    .attr('class', 'card tip')
    .style('padding', '8px') // Add some padding so the tooltip content doesn't touch the border of the tooltip
    .style('position', 'absolute') // Absolutely position the tooltip to the body. Later we'll use transform to adjust the position of the tooltip
    .style('left', 0)
    .style('top', 0)
    .style('visibility', 'visible');

    // graph.call(tip);

// Update function
const update = data => {

    // Update color scale domain
    color.domain(data.map(d => d.name));

    // Update and call legend
    legendGroup.call(legend)
    legendGroup.selectAll('text').attr('fill', 'white');

    // Join enhanced (pie) data to path elements
    const paths = graph.selectAll('path')
        .data(pie(data));

    // Handle the exit selection
    paths.exit()
        .transition().duration(750)
        .attrTween('d', arcTweenExit)
        .remove();

    // Handle the current DOM path updates
    paths.transition().duration(750)
        .attrTween('d', arcTweenUpdate);

    paths.enter()
        .append('path')
            .attr('class', 'arc')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('d', arcPath)
            .attr('fill', d => color(d.data.name))
            .each(function(d) { this._current = d })
            .transition().duration(750).attrTween('d', arcTweenEnter);

    // Add events
    // graph.selectAll('path')
    //     .on('mouseover', handleMouseOver)
    //     .on('mouseout', handleMouseOut)
    //     .on('click', handleClick);

    graph.selectAll("path")
        .on("mouseover", (event, d) => {
            let content = `<div class="name">${d.data.name}</div>`;
            content += `<div class="cost">$${d.data.cost}</div>`;
            content += `<div class="delete">Click slice to delete</div>`;
            tip.html(content).style("visibility", "visible");
            handleMouseOver(event, d);
        })
        .on("mouseout", (event, d) => {
            tip.style("visibility", "hidden");
            handleMouseOut(event, d);
        })
        .on("mousemove", (event, d) => {
            tip.style("transform", `translate(${event.pageX}px,${event.pageY}px)`); // We can calculate the mouse's position relative the whole page by using event.pageX and event.pageY.
        })
        .on("click", handleClick);
};

// Data array and firestore
var data = [];

db.collection('expenses').orderBy('cost').onSnapshot(res => {

    res.docChanges().forEach(change => {

        const doc = {...change.doc.data(), id: change.doc.id };

        switch (change.type) {
            case 'added':
                data.push(doc);
                break;
            case 'modified':
                const index = data.findIndex(item => item.id === doc.id);
                data[index] = doc;
                break;
            case 'removed':
                data = data.filter(item => item.id !== doc.id);
                break;
            default:
                break;
        }
    });

    update(data);

});

// Handle tween animation for entering new item/document
const arcTweenEnter = d => {
    let i = d3.interpolate(d.endAngle - 0.1, d.startAngle)

    return function(t) {
        d.startAngle = i(t);
        return arcPath(d);
    };
};

// Handle tween animation for removing new item/document
const arcTweenExit = d => {
    let i = d3.interpolate(d.startAngle, d.endAngle)

    return function(t) {
        d.startAngle = i(t);
        return arcPath(d);
    };
};


// Use function keyword to allow use of 'this'
function arcTweenUpdate(d) {
    console.log(this._current, d);
    // Interpolate between the two objects
    let i = d3.interpolate(this._current, d);

    // // Update the current prop w/ new updated data
    this._current = i(1);

    return function(t) {
        // i(t) returns a value of d (data object) which we pass to arcPath
        return arcPath(i(t));
    };
}

// Event handlers
/**
 * We'll name the transitions by passing in a string name into transition()
 * This is so that transitions don't interfere with each other
 * If not, if you hover over pie slice during page load, pie slice doesn't fill completely.
 */

// function handleMouseOver(e, d) {
//     d3.select(this)
//         .transition('changeSlideFill').duration(300)
//             .attr('fill', '#fff');
// }
const handleMouseOver = (e, d) => {
    d3.select(e.currentTarget).transition().duration(300).attr("fill", "#fff");
}

// function handleMouseOut(e, d) {
//     d3.select(this)
//         .transition('changeSlideFill').duration(300)
//             .attr('fill', color(d.data.name));
// }
const handleMouseOut = (e, d) => {
    d3.select(e.currentTarget).transition().duration(300).attr("fill", color(d.data.name));
}

// function handleClick(e, d) {
//     const id = d.data.id;
//     db.collection('expenses').doc(id).delete();
// }
const handleClick = (e, d) => {
    const id = d.data.id;
    db.collection('expenses').doc(id).delete();
}