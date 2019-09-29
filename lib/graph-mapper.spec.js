const assert = require('assert')
var { GraphMapper, helpers } = require('./graph-mapper')


describe ("GraphMapper", function () {

	let target, source

	beforeEach (function () {
		target = {
			name: 'Bruce Wayne Batman',
			address: {
				city: 'Gotham',
				state: {
					country: 'USA'
				}
			}
		}

		source = {
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
	})




	it ("is a two way mapping between a target object, and a source object.", function () {
		let mapper = new GraphMapper({
			to: {
				'name': helpers.join(['Person.FirstName', 'Person.LastName', 'Person.Job']),
				'address.city': 'Person.Address.City',
				'address.state.country': 'Person.Address.Country'
			}
		})

		assert.deepEqual( mapper.read(source), target )
		assert.deepEqual( mapper.write(target), source )
	})




	it("can specify a {from} option to indicate all sources beneath that path. This helps re-use.", function () {
		let mapper = new GraphMapper({
			from: 'Person',
			to: {
				'name': helpers.join(['FirstName', 'LastName', 'Job']),
				'address.city': 'Address.City',
				'address.state.country': 'Address.Country'
			}
		})

		assert.deepEqual(mapper.read(source), target)
		assert.deepEqual(mapper.write(target), source)
	})




	it("can specify a nested {to} option to setup a child mapper. This helps re-use.", function () {
		let mapper = new GraphMapper({
			from: 'Person',
			to: {
				'name': helpers.join(['FirstName', 'LastName', 'Job']),
				'address': {
					to: {
						'city': 'Address.City',
						'state.country': 'Address.Country'
					}
				}
			}
		})

		assert.deepEqual(mapper.read(source), target)
		assert.deepEqual(mapper.write(target), source)
	})




	it("can use the same helpful {from} in the child mapper to reduce duplication and help provide richer mapping info.", function () {
		let mapper = new GraphMapper({
			from: 'Person',
			to: {
				'name': helpers.join(['FirstName', 'LastName', 'Job']),
				'address': {
					from: 'Address',
					to: {
						'city': 'City',
						'state.country': 'Country'
					}
				}
			}
		})

		assert.deepEqual(mapper.read(source), target)
		assert.deepEqual(mapper.write(target), source)
	})




	it("can of course nest as many child mappers deep as desired.", function () {
		let mapper = new GraphMapper({
			from: 'Person',
			to: {
				'name': helpers.join(['FirstName', 'LastName', 'Job']),
				'address': {
					from: 'Address',
					to: {
						'city': 'City',
						'state': {
							to: {
								'country': 'Country'
							}
						}
					}
				}
			}
		})

		assert.deepEqual(mapper.read(source), target)
		assert.deepEqual(mapper.write(target), source)
	})




	it ("can use a mappers registry to easily re-use mappers, intead of nesting them every time", function () {
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

		assert.deepEqual(mapper.read(source), target)
		assert.deepEqual(mapper.write(target), source)
	})




	it ("can use {prevent_empty_target:true} read() option to remove a structure if the entire structure is undefined or null", function () {
		let mapper = new GraphMapper({
			to: {
				a: 'SourceA',
				b: {
					to: {
						ba: 'SourceB'
					}
				}
			}
		})

		// by default
		assert.deepEqual( mapper.read({SourceA: undefined, SourceB: undefined}) ,  {b: {}} )
		assert.deepEqual( mapper.read({SourceA: null, SourceB: null}) ,  {a: null, b: {ba: null}} )
		// with option
		assert.deepEqual( mapper.read({SourceA: null, SourceB: null}, {prevent_empty_target: true}) ,  )
		assert.deepEqual( mapper.read({SourceA: 'A', SourceB: null}, {prevent_empty_target: true}) ,  {a: 'A'} )
		assert.deepEqual( mapper.read({SourceA: null, SourceB: 'B'}, {prevent_empty_target: true}) ,  {a: null, b: {ba: 'B'}} )
	})


	context ("with a defined default_value", function () {

		it ("uses that value when {prevent_empty_target:true}", function () {
			let mapper = new GraphMapper({
				default_value: null,
				to: {
					a: 'SourceA',
					b: {
						to: {
							ba: 'SourceB'
						}
					}
				}
			})

			// by default
			assert.deepEqual(mapper.read({ SourceA: undefined, SourceB: undefined }), { b: {} })
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: null }), { a: null, b: { ba: null } })
			// with {prevent_empty_target}
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: null }, { prevent_empty_target: true }),  null )
			assert.deepEqual(mapper.read({ SourceA: 'A', SourceB: null }, { prevent_empty_target: true }), { a: 'A' })
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: 'B' }, { prevent_empty_target: true }), { a: null, b: { ba: 'B' } })
		})

		it("will not end up using the top level default value if there is a default value for a child mapper (or other property)", function () {
			let mapper = new GraphMapper({
				default_value: 'default_a',
				to: {
					a: 'SourceA',
					b: {
						default_value: 'default_b',
						to: {
							ba: 'SourceB'
						}
					}
				}
			})

			// by default
			assert.deepEqual(mapper.read({ SourceA: undefined, SourceB: undefined }), { b: {} })
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: null }), { a: null, b: { ba: null } })
			// with {prevent_empty_target}
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: null }, { prevent_empty_target: true }), {a: null, b: 'default_b'})
			assert.deepEqual(mapper.read({ SourceA: 'A', SourceB: null }, { prevent_empty_target: true }), { a: 'A', b: 'default_b' })
			assert.deepEqual(mapper.read({ SourceA: null, SourceB: 'B' }, { prevent_empty_target: true }), { a: null, b: { ba: 'B' } })
		})
	})
















	describe("overriding the root source path", function () {
		let mappers, target, source

		beforeEach(function () {
			mappers = new GraphMapper.Registry()

			mappers.define('person', {
				from: 'Person',
				to: {
					'address': mappers.use('address', { from: 'MainAddress' })
				}
			})

			mappers.define('address', {
				from: 'Address',
				to: {
					'street': 'Street1',
					'city': 'City',
				}
			})

			source = {
				Person: {
					MainAddress: {
						Street1: 'Street1 value',
						City: 'City value'
					}
				}
			}

			target = {
				address: {
					street: 'Street1 value',
					city: 'City value'
				}
			}
		})

		it("can decide which data to send to nested mappers using {from}", function () {
			assert.deepEqual(mappers.get('person').read(source), target)
			assert.deepEqual(mappers.get('person').write(target), source)
		})

		it("will use the override root_source_path when outputting a source_tree()", function () {
			let source_tree = {
				from: {
					Person: {
						from: {
							MainAddress: {
								fields: ['Street1', 'City']
							}
						}
					}
				}
			}
			assert.deepEqual(mappers.get('person').source_tree(), source_tree)
		})

	})





































	describe ("advanced mapping configuration", function () {

		describe ('= sugar', function () {
			it ('can use an equals sign when the source key is the same as the target', function () {
				let mapper = new GraphMapper({
					to: {
						foo: '='
					}
				})

				assert.deepEqual( mapper.read({ foo: 'bar' }), { foo: 'bar'})
				assert.deepEqual( mapper.write({ foo: 'bar' }), { foo: 'bar'})
			})

			it ('works when there is a source path', function () {
				let mapper = new GraphMapper({
					from: 'nest',
					to: {
						foo: '='
					}
				})

				let source = { nest: { foo: 'bar' }}
				let target = { foo: 'bar' }

				assert.deepEqual( mapper.read(source), target)
				assert.deepEqual( mapper.write(target), source)
			})

			it ('works when the target is nested', function () {
				let mapper = new GraphMapper({
					from: 'nest',
					to: {
						buz: {
							to: {
								foo: '='
							}
						}
					}
				})

				let source = { nest: { foo: 'bar' }}
				let target = { buz: { foo: 'bar' }}

				assert.deepEqual( mapper.read(source), target)
				assert.deepEqual( mapper.write(target), source)
			})

			it ('works when the target is a dot path, but only for an exact match', function () {
				let mapper = new GraphMapper({
					from: 'nest',
					to: {
						'buz.foo': '='
					}
				})

				let source = { nest: { buz: { foo: 'bar' }}}
				let target = { buz: { foo: 'bar' }}

				assert.deepEqual( mapper.read(source), target)
				assert.deepEqual( mapper.write(target), source)
			})
		})


		describe ("manually defined read and write functions to map a property", function () {

			it ("uses the return values of read() and write() to assign target and source paths", function () {
				let mapper = new GraphMapper({
					to: {
						'name': {
							from: ['Person.FirstName', 'Person.LastName', 'Person.Job'],
							read: function (FirstName, LastName, Job) {
								return `${FirstName} ${LastName} ${Job}`
							},
							write: function (combined_value) {
								return combined_value.split(' ')
							}
						},
						'address.city': 'Person.Address.City',
						'address.state.country': 'Person.Address.Country'
					}
				})

				assert.deepEqual( mapper.read(source) ,  target )
				assert.deepEqual( mapper.write(target) ,  source )
			})

			it ("will always generate a target_path as long as read() doesn't return undefined", function () {
				let mapper = new GraphMapper({
					to: {
						example: {
							from: 'Source.Path',
							read: (value) => {
								if (value == 'BAD VALUE') return
								else return 'constant value!'
							}
						},
					}
				})

				assert.deepEqual( mapper.read({}) ,  {example: 'constant value!'} )
				assert.deepEqual( mapper.read({Source: {Path: 'BAD VALUE'}}) ,  {} )
			})

			it("will always generate a source path as long as write() doesn't return undefined", function () {
				let mapper = new GraphMapper({
					to: {
						example: {
							from: 'Source.Path',
							write(value) {
								if (value == 'BAD VALUE') return
								else return value
							}
						},
					}
				})

				assert.deepEqual(mapper.write({example: null}), {Source:{Path:null}})
				assert.deepEqual(mapper.write({example: 'BAD VALUE'}), {})
			})
		})


		describe ("with a constructor", function () {
			it ("calls the constructor with new, passing in the result on .read()", function () {
				class Example {
					constructor(data) {
						this.name = data.name
					}

					greet() {
						return `Hello, ${this.name}!`
					}
				}

				let mapper = new GraphMapper({
					constructor: Example,
					to: {
						name: 'SourceName'
					}
				})

				let result = mapper.read({SourceName: 'Batman'})

				assert.equal( result instanceof Example, true)
				assert.deepEqual( result.greet() ,  'Hello, Batman!' )
			})
		})


		describe ('with multiple functions working as a pipe', function () {

			it ('pipes read functions together in order', function () {
				function join(a, b) {
					return a + ' ' + b
				}

				function capitalize(value) {
					return value.toUpperCase()
				}

				function emphasize(value) {
					return value + '!!!'
				}

				let mapper = new GraphMapper({
					to: {
						example: {
							from: ['Source.A', 'Source.B'],
							read: [join, capitalize, emphasize]
						},
					}
				})

				assert.deepEqual( mapper.read({Source: {A: 'example', B: 'input'}}) ,  {example: 'EXAMPLE INPUT!!!'} )
			})


			it ('pipes write functions together in order', function () {
				function split(value) {
					return value.split(' ')
				}

				function lower(value) {
					return value.toLowerCase()
				}

				function deemphasize(value) {
					return value.replace(/!+$/, '')
				}

				let mapper = new GraphMapper({
					to: {
						example: {
							from: ['Source.A', 'Source.B'],
							write: [deemphasize, lower, split]
						},
					}
				})

				assert.deepEqual( mapper.write({example: 'EXAMPLE INPUT!!!'}) , {Source: {A: 'example', B: 'input'}} )
			})
		})

	})























	describe ('mapping arrays', function () {
		let target, source

		beforeEach (function () {
			target = {
				list: [
					{ id: 1, name: 'First'  },
					{ id: 2, name: 'Second' },
				]
			}

			source = {
				nested: {
					ThingList: [
						{ ID: 1, Name: 'First'  },
						{ ID: 2, Name: 'Second' },
					]
				}
			}
		})

		it ('loops the source like Array.map', function () {
			let mapper = new GraphMapper({
				from: 'nested',
				to: {
					list: {
						from: 'ThingList',
						array: true,
						to: {
							id: 'ID',
							name: 'Name'
						}
					}
				}
			})

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), source )
		})


		it ('could be accomplished manually with the same', function () {
			let submapper = new GraphMapper({
				to: {
					id: 'ID',
					name: 'Name'
				}
			})

			let mapper = new GraphMapper({
				from: 'nested',
				to: {
					list: {
						from: 'ThingList',
						read: (val) => val.map(item => submapper.read(item)),
						write: (val) => val.map(item => submapper.write(item))
					}
				}
			})

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), source )
		})

	})


































	describe ("#source_tree()", function () {
		let source_tree

		beforeEach (function () {
			source_tree = {
				from: {
					Person: {
						fields: ['FirstName', 'LastName', 'Job'],
						from: {
							Address: {
								fields: ['City', 'Country']
							}
						}
					}
				}
			}
		})

		it ("returns a tree data structure describing every source path needed to create the target", function () {
			let mapper


			mapper = new GraphMapper({
				to: {
					'name': helpers.join(['Person.FirstName', 'Person.LastName', 'Person.Job']),
					'address.city': 'Person.Address.City',
					'address.state.country': 'Person.Address.Country'
				}
			})
			assert.deepEqual( mapper.source_tree() ,  source_tree )


			mapper = new GraphMapper({
				from: 'Person',
				to: {
					'name': helpers.join(['FirstName', 'LastName', 'Job']),
					'address': {
						to: {
							'city': 'Address.City',
							'state.country': 'Address.Country'
						}
					}
				}
			})
			assert.deepEqual( mapper.source_tree() ,  source_tree )


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
					'state': mappers.use('state')
				}
			})

			mappers.define('state', {
				to: {
					'country': 'Country'
				}
			})
			assert.deepEqual( mappers.get('person').source_tree() ,  source_tree )
		})


		it ("will not include duplicates", function () {
			let mapper = new GraphMapper({
				to: {
					name: 'PersonName',
					name_again: 'PersonName'
				}
			})

			let source_tree = {
				fields: ['PersonName']
			}

			assert.deepEqual( mapper.source_tree() ,  source_tree )
		})


		it ("works with arrays", function () {
			let mapper = new GraphMapper({
				to: {
					list: {
						from: 'PersonList',
						array: true,
						to: {
							name: 'PersonName',
						}
					}
				}
			})

			let source_tree = {
				from: {
					PersonList: {
						array: true,
						fields: ['PersonName']
					}
				}
			}

			assert.deepEqual( mapper.source_tree() , source_tree )
		})


		describe ("source trees for only some target paths", function () {
			var mappers

			beforeEach(function () {
				mappers = new GraphMapper.Registry()

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
			})

			it ("will return the source tree for select target paths", function () {
				let source_tree = {
					from: {
						Person: {
							from: {
								Address: {
									fields: ['Country']
								}
							}
						}
					}
				}

				assert.deepEqual( mappers.get('person').source_tree(['address.state.country']) ,  source_tree )
			})


			it ("works even with long target paths", function () {
				let mapper, source_tree

				mapper = new GraphMapper({
					to: {
						'name': helpers.join(['Person.FirstName', 'Person.LastName', 'Person.Job']),
						'address.city': 'Person.Address.City',
						'address.state.country': 'Person.Address.Country'
					}
				})

				source_tree = {
					from: {
						Person: {
							from: {
								Address: {
									fields: ['Country']
								}
							}
						}
					}
				}
				assert.deepEqual(mapper.source_tree(['address.state.country']), source_tree)
			})


			it("throws an error if no valid paths are selected (see pick() below)", function () {
				let mapper, source_tree

				mapper = new GraphMapper({
					to: {
						'name': helpers.join(['Person.FirstName', 'Person.LastName', 'Person.Job']),
						'address.city': 'Person.Address.City',
						'address.state.country': 'Person.Address.Country'
					}
				})

				source_tree = {
					from: {
						Person: {
							from: {
								Address: {
									fields: ['Country']
								}
							}
						}
					}
				}
				assert.throws(() => mapper.source_tree(['address']))
			})

		})
	})





	describe (".pick()", function () {
		let mapper

		beforeEach(function () {
			let mappers = new GraphMapper.Registry()

			mappers.define('person', {
				from: 'Person',
				to: {
					name: 'Name',
					age: 'Age'
				}
			})

			mapper = new GraphMapper({
				to: {
					example: 'TopLevelExample',
					not_used: 'ThisDoesntMatter',
					'inline.nested': 'Some.InlineKey',
					address: {
						from: 'Address',
						to: {
							street: 'Street',
							city: 'CityField',
							country: {
								to: {
									abbrev: 'CountryCode'
								}
							}
						}
					},
					profile: mappers.use('person', {from: 'APersonHere'})
				}
			})
		})


		it ("returns a new mapper, which is a subset of the original, using only the selected target paths", function () {
			let sub_mapper = mapper.pick(['example', 'address.country.abbrev', 'profile.name', 'inline.nested'])
			assert.deepEqual( sub_mapper.source_list().sort(), ['APersonHere.Name', 'Address.CountryCode', 'Some.InlineKey', 'TopLevelExample'] )
		})


		it ("throws an error if a path does not exist", function () {
			assert.throws(() => mapper.pick(['missing_path']), { message: `GraphMapper: The target path {missing_path} does not exist.` })
			assert.throws(() => mapper.pick(['missing_top_level.is.invalid']), { message: `GraphMapper: The target path {missing_top_level} does not exist.`})
		})
	})






















































	describe ("ERRATA", function () {

		it("doesn't read when there is no usable source value", function () {
			let mapper = new GraphMapper({
				to: {
					name: 'SomeName'
				}
			})
			assert.equal(mapper.read(), undefined)
			assert.equal(mapper.read(null), undefined)
			assert.equal(mapper.read("not an object"), undefined)
			assert.equal(mapper.read([]), undefined)
		})


		it ("doesn't write when there is no usable target value", function () {
			let mapper = new GraphMapper({
				to: {
					name: 'SomeName'
				}
			})
			assert.equal(mapper.write(), undefined)
			assert.equal(mapper.write(null), undefined)
			assert.equal(mapper.write("not an object"), undefined)
			assert.equal(mapper.write([]), undefined)
		})


		it("should throw a helpful error message when mapper.use() is called under a 'to' property", function () {
			let mappers = new GraphMapper.Registry()


			assert.throws(() => {
				mappers.define('attender', {
					from: 'attenderSource',
					to: {
						address: {
							to: mappers.use('address', { from: 'Person.Address' })
						}
					}
				})
			 }, { message: `Don't use the 'to' property with mapper.use(). Correct is: my_output: mapper.use(...)` })
		})


		it("should throw a helpful error message when 'to' used with multiple sources", function () {
			let mappers = new GraphMapper.Registry()


			assert.throws(() => {
				mappers.define('attender', {
					to: {
						address: {
							from: ['SourceOne', 'SourceTwo'],
							to: {
								street: 'ThisIsAmbiguous'
							}
						}
					}
				})
			 }, { message: `Don't use the 'to' property with multiple 'from' sources. You can only nest under a single source.` })
		})


		it ("by default: it reads or writes only the keys avaialble", function () {
			let mapper = new GraphMapper({
				to: {
					one: 'SourceOne',
					two: 'SourceTwo'
				}
			})

			assert.deepEqual( mapper.read({ SourceOne: 'SourceOne value' }) ,  { one: 'SourceOne value' } )
			assert.deepEqual( mapper.read({ SourceOne: 'SourceOne value', SourceTwo: null }) ,  { one: 'SourceOne value', two: null } )

			assert.deepEqual(mapper.write({ one: 'SourceOne value' }), { SourceOne: 'SourceOne value' })
			assert.deepEqual(mapper.write({ one: 'SourceOne value', two: null }), {  SourceOne: 'SourceOne value', SourceTwo: null })
		})

		describe ('array source values', function () {
			let mapper, source, output

			beforeEach(function () {
				mapper = new GraphMapper({
					to: {
						simple_array: 'array_source',
						changed_array: {
							from: 'array_source',
							read: (list) => list.map(n => n.toUpperCase()),
							write: (list) => list && list.map(n => n.toLowerCase()),
						},
						string: {
							from: ['string_source', 'array_source'],
							read: (str, list) => str + ',' + list.join(','),
							write: (str) => {
								if (!str) return
								let [first, ...rest] = str.split(',')
								return [first, rest]
							}
						}
					}
				})

				source = {
					string_source: 'x',
					array_source: ['a', 'b', 'c'],
				}

				output = {
					simple_array: ['a', 'b', 'c'],
					changed_array: ['A', 'B', 'C'],
					string: 'x,a,b,c'
				}
			})

			it ('can read array source values, and those do not conflict with the handling of multiple sources', function () {
				assert.deepEqual( mapper.read(source), output)
			})

			it ('can write to array source values, and those do not conflict with the handling of multiple sources', function () {
				assert.deepEqual( mapper.write({ simple_array: ['a', 'b', 'c'] }), { array_source: ['a', 'b', 'c']})

				assert.deepEqual( mapper.write({ changed_array: ['A', 'B', 'C'] }), { array_source: ['a', 'b', 'c']})

				assert.deepEqual( mapper.write({ string: 'x,a,b,c' }), { string_source: 'x', array_source: ['a', 'b', 'c']})
			})
		})


	})







	describe ("bugs", function () {
		it ("maps correctly when a simple path and a child mapper reference the same path starting point", function () {
			let mappers = new GraphMapper.Registry()

			mappers.define('attender', {
				from: 'attenderSource',
				to: {
					id: 'ID',
					seating_request: 'SamePointHere.RequestedSeat',
					group: mappers.use('group', { from: 'SamePointHere' }),
				}
			})

			mappers.define('group', {
				from: 'SamePointHere',
				to: {
					id: 'ID',
					people_count: 'GroupCount',
					arrive_date: helpers.iso_date('ArrivalDate'),
					depart_date: helpers.iso_date('DepartureDate'),
				}
			})

			assert.deepEqual( mappers.get('attender').source_tree() , {
				from: {
					attenderSource: {
						fields: ['ID'],
						from: {
							SamePointHere: {
								fields: ['RequestedSeat', 'ID', 'GroupCount', 'ArrivalDate', 'DepartureDate']
							}
						}
					}
				}
			})


		})
	})














	describe ("helpers", function () {
		function test_read(path_config, source_value, target_value) {
			let mapper = new GraphMapper({ to: { target: path_config } })
			assert.deepEqual( mapper.read({source: source_value}).target, target_value )
		}

		function test_write(path_config, target_value, source_value) {
			let mapper = new GraphMapper({ to: { target: path_config } })
			assert.deepEqual( mapper.read({source: target_value}).target, source_value )
		}

		describe (".strip_html()", function () {

			it ("removes html tags on read", function () {
				test_read( helpers.strip_html('source'), 'my <blink>Group Title</blink>', 'my Group Title' )
			})

			it ("does not change anything on write", function () {
				test_write( helpers.strip_html('source'), 'my Group Title', 'my Group Title' )
			})

			it ("only removes full tags", function () {
				test_read( helpers.strip_html('source'), 'my <blink>Group Title</blink', 'my Group Title</blink' )
			})

			it ("returns null if there is nothing left", function () {
				test_read( helpers.strip_html('source'), '<blink></blink>', null )
			})

		})

	})




})
