// LAST RUN
// write x 514,324 ops/sec ±0.42% (91 runs sampled)
const Benchmark = require('benchmark')
const { GraphMapper } = require('../lib/graph-mapper')

const suite = new Benchmark.Suite


let target = {
	first: 'Bruce',
	last: 'Wayne',
	name: 'Bruce Wayne',
}


const mapper = new GraphMapper({
	from: 'Person',
	to: {
		first: 'FirstName',
		last: 'LastName',
		name: {
			from: ['FirstName', 'LastName'],
			read: (first, last) => first + ' ' + last,
			write: name => name.split(' '),
		}
	}
})





// add tests
suite
.add('write', function() {
  mapper.write(target)
})






// add listeners
.on('cycle', function(event) {
  console.log(String(event.target))
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').map('name'))
})
// run async
.run({ 'async': true })



// RESULTS
// read x 1,060,027 ops/sec ±0.52% (88 runs sampled)