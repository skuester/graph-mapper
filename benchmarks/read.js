// LAST RUN
// MANUAL MAPPING (comparison) - manual mapper x 817,554,462 ops/sec ±1.57% (82 runs sampled)
// BASELINE - read x 661,519 ops/sec ±0.18% (89 runs sampled)
// AFTER pipes added - read x 655,999 ops/sec ±0.24% (93 runs sampled)
const Benchmark = require('benchmark')
const GraphMapper = require('../index')

const suite = new Benchmark.Suite


let source = {
	Person: {
		Job: 'Batman',
		FirstName: 'Bruce',
		LastName: 'Wayne',
		Address: {
			City: 'Gotham',
			Country: 'USA'
		}
	},
}

const mapper = new GraphMapper({
	from: 'Person',
	to: {
		first: 'FirstName',
		last: 'LastName',
		name: {
			from: ['FirstName', 'LastName'],
			read: (first, last) => first + ' ' + last
		}
	}
})


function manual_mapper(source) {
	return {
		first: source.FirstName,
		last: source.LastName,
		name: source.FirstName + ' ' + source.LastName,
	}
}



// add tests
suite
.add('read', function() {
  mapper.read(source)
})


.add('manual mapper', function() {
  manual_mapper(source)
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