const Benchmark = require('benchmark')
const GraphMapper = require('../index')
const helpers = require('../helpers')

const suite = new Benchmark.Suite

let target = {
	name: 'Bruce Wayne Batman',
	address: {
		city: 'Gotham',
		state: {
			country: 'USA'
		}
	}
}

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


let mappers = new GraphMapper.Registry()

mappers.define('person', {
	from: 'Person',
	to: {
		'name': helpers.join(['FirstName', 'LastName', 'Job']),
		'address': mappers.use('address')
	}
})

mappers.define('address', {
	from: 'Address',
	to: {
		'city': 'City',
		'state': {
			to: {
				'country': 'Country'
			}
		}
	}
})

mappers.define('state', {
	to: {
		'country': 'Country'
	}
})

let mapper = mappers.get('person')



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