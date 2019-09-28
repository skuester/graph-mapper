// LAST RUN
// BASELINE - read x 661,519 ops/sec ±0.18% (89 runs sampled)
// AFTER pipes added - read x 655,999 ops/sec ±0.24% (93 runs sampled)
const Benchmark = require('benchmark')
const { GraphMapper } = require('../lib/graph-mapper')

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




// add tests
suite
.add('read', function() {
  mapper.read(source)
})


// .add('String#indexOf', function() {
//   'Hello World!'.indexOf('o') > -1;
// })





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