const assert = require('assert')
const GraphMapper = require('./graph-mapper')
const {
	pipe,
	not_null,
	defaults_to,
	join,
	strip_html,
	iso_date,
	transform,
	boolean,
	boolean_from_int,
	opposite_boolean_from_int,
	number,
	json_parse,
} = require('./helpers')




describe ('GraphMapper helper functions', function () {

	describe ('pipe()', function () {

		it ('is the basic unit of helpers, and by itself does nothing extra', function () {
			let mapper = new GraphMapper({
				to: {
					output: pipe('input')
				}
			})

			let target = { output: 'value' }
			let source = { input: 'value' }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), source )
		})


		it ('pipes read and write functions together in reversable order', function () {
			const announce = {
				read: v => v + '!!!',
				write: v => v.replace(/!+$/, ''),
			}

			const double = {
				read: v => v * 2,
				write: v => v / 2,
			}

			let mapper = new GraphMapper({
				to: {
					output: pipe('input', double, announce)
				}
			})

			let target = { output: '4!!!' }
			let source = { input: 2 }

			assert.deepEqual( mapper.read(source), target )
			// Notice that it runs the write operations in reverse
			assert.deepEqual( mapper.write(target), source )
		})


		it ('works fine if a helper does not implement a method', function () {
			const only_double_read = {
				read: v => v * 2
			}

			const only_double_write = {
				write: v => v * 2
			}

			let mapper = new GraphMapper({
				to: {
					output: pipe('input', only_double_read, only_double_write)
				}
			})

			let target = { output: 4 }
			let source = { input: 2 }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), { input: 8 })
		})

	})


	describe ('defaults_to', function () {
		it ('uses a default when the value is undefined (read only)', function () {
			let mapper = new GraphMapper({
				to: {
					when_undefined: pipe('undefined_source', defaults_to('something basic')),
					when_null: pipe('null_source', defaults_to('something basic')),
				}
			})

			let target = { when_undefined: 'something basic', when_null: null }
			let source = { undefined_source: undefined, null_source: null }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), { undefined_source: 'something basic', null_source: null })
		})
	})



	describe ('not_null', function () {
		it ('does not permit nulls, converting them instead to undefined (read only)', function () {
			let mapper = new GraphMapper({
				to: {
					when_undefined: pipe('undefined_source', defaults_to('something basic')),
					when_null: pipe('null_source', not_null(), defaults_to('something basic')),
				}
			})

			let target = { when_undefined: 'something basic', when_null: 'something basic' }
			let source = { undefined_source: undefined, null_source: null }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), { undefined_source: 'something basic', null_source: 'something basic' })
		})
	})



	describe ('join', function () {
		it ('joins multiple values together with a space by default', function () {
			let mapper = new GraphMapper({
				to: {
					together: pipe(['a', 'b', 'c'], join()),
				}
			})

			let target = { together: 'A B C' }
			let source = { a: 'A', b: 'B', c: 'C' }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), source )
		})
	})




	describe ("strip_html()", function () {
		function test_read(path_config, source_value, target_value) {
			let mapper = new GraphMapper({ to: { target: path_config } })
			assert.deepEqual( mapper.read({source: source_value}).target, target_value )
		}

		function test_write(path_config, target_value, source_value) {
			let mapper = new GraphMapper({ to: { target: path_config } })
			assert.deepEqual( mapper.read({source: target_value}).target, source_value )
		}


		it ("removes html tags on read", function () {
			test_read( pipe('source', strip_html()), 'my <blink>Group Title</blink>', 'my Group Title' )
		})

		it ("does not change anything on write", function () {
			test_write( pipe('source', strip_html()), 'my Group Title', 'my Group Title' )
		})

		it ("only removes full tags", function () {
			test_read( pipe('source', strip_html()), 'my <blink>Group Title</blink', 'my Group Title</blink' )
		})

		it ("returns null if there is nothing left", function () {
			test_read( pipe('source', strip_html()), '<blink></blink>', null )
		})

	})



	describe ('iso_date', function () {
		it ('formats a date', function () {
			let mapper = new GraphMapper({
				to: {
					date: pipe('input', iso_date()),
				}
			})

			let source = { input: '2019-01-01' }
			let target = { date: '2019-01-01T00:00:00.000Z' }

			assert.deepEqual( mapper.read(source), target )
			assert.deepEqual( mapper.write(target), { input: '2019-01-01T00:00:00.000Z' } )
		})
	})




	describe ('transform', function () {

		it ('maps a source value using an object', function () {
			let mapper = new GraphMapper({
				to: {
					status: pipe('StatusID', transform({ 1: 'active', 2: 'pending' })),
				}
			})

			assert.deepEqual( mapper.read({ StatusID: 1 }), { status: 'active' } )
			assert.deepEqual( mapper.read({ StatusID: 2 }), { status: 'pending' } )
			assert.deepEqual( mapper.read({ StatusID: null }), { status: null } )

			assert.deepEqual( mapper.write({ status: 'active' }), { StatusID: 1 } )
			assert.deepEqual( mapper.write({ status: 'pending' }), { StatusID: 2 } )
			assert.deepEqual( mapper.write({ status: null }), { StatusID: null } )
		})
	})



	describe ('boolean', function () {

		it ('converts the read to a boolean using !!', function () {
			let mapper = new GraphMapper({
				to: {
					is_thing: pipe('input', boolean()),
				}
			})

			assert.deepEqual( mapper.read({ input: true }), { is_thing: true } )
			assert.deepEqual( mapper.read({ input: 1 }), { is_thing: true } )
			assert.deepEqual( mapper.read({ input: false }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: 0 }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: null }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: undefined }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: '' }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: 'string' }), { is_thing: true } )

			// Does nothing to writes
			assert.deepEqual( mapper.write({ is_thing: 'nothing' }), { input: 'nothing' } )
		})
	})



	describe ('boolean_from_int', function () {

		it ('converts a boolean from and to an int', function () {
			let mapper = new GraphMapper({
				to: {
					is_thing: pipe('input', boolean_from_int()),
				}
			})

			assert.deepEqual( mapper.read({ input: 1 }), { is_thing: true } )
			assert.deepEqual( mapper.read({ input: 0 }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: null }), {} )
			assert.deepEqual( mapper.read({ input: undefined }), {} )

			assert.deepEqual( mapper.write({ is_thing: true }), { input: 1 } )
			assert.deepEqual( mapper.write({ is_thing: false }), { input: 0 } )
			assert.deepEqual( mapper.write({ is_thing: null }), {} )
			assert.deepEqual( mapper.write({ is_thing: undefined }), {} )
		})
	})


	describe ('opposite_boolean_from_int', function () {

		it ('converts a boolean from and to an int', function () {
			let mapper = new GraphMapper({
				to: {
					is_thing: pipe('input', opposite_boolean_from_int()),
				}
			})

			assert.deepEqual( mapper.read({ input: 1 }), { is_thing: false } )
			assert.deepEqual( mapper.read({ input: 0 }), { is_thing: true } )
			assert.deepEqual( mapper.read({ input: null }), {} )
			assert.deepEqual( mapper.read({ input: undefined }), {} )

			assert.deepEqual( mapper.write({ is_thing: true }), { input: 0 } )
			assert.deepEqual( mapper.write({ is_thing: false }), { input: 1 } )
			assert.deepEqual( mapper.write({ is_thing: null }), {} )
			assert.deepEqual( mapper.write({ is_thing: undefined }), {} )
		})
	})



	describe ('number', function () {

		it ('converts string to a number', function () {
			let mapper = new GraphMapper({
				to: {
					is_thing: pipe('input', number()),
				}
			})

			assert.deepEqual( mapper.read({ input: 1 }), { is_thing: 1 } )
			assert.deepEqual( mapper.read({ input: 0 }), { is_thing: 0 } )
			assert.deepEqual( mapper.read({ input: null }), { is_thing: 0 } )
			assert.deepEqual( mapper.read({ input: '123.50' }), { is_thing: 123.5 } )
			assert.deepEqual( mapper.read({ input: 'not a number' }), { } )
			assert.deepEqual( mapper.read({ input: undefined }), {} )
			// Does nothing to writes
			assert.deepEqual( mapper.write({ is_thing: 'nothing' }), { input: 'nothing' } )
		})
	})



	describe ('json_parse', function () {
		let mapper

		beforeEach(function () {
			mapper = new GraphMapper({
				to: {
					obj: pipe('input', json_parse()),
				}
			})
		})

		it ('runs JSON.parse() on the source', function () {
			assert.deepEqual( mapper.read({ input: `{"foo":"bar"}` }), { obj: { foo: 'bar' } } )
			assert.deepEqual( mapper.write({ obj: { foo: 'bar' } }), { input: `{"foo":"bar"}` } )
		})

		it ('throws an error by default when source is not valid JSON', function () {
			assert.throws(() => mapper.read({ input: `{"foo":"bar` }) )
		})

		it ('will ignore the error, and return an empty response if that is chosen', function () {
			mapper = new GraphMapper({
				to: {
					obj: pipe('input', json_parse({ graceful: true })),
				}
			})
			assert.deepEqual(mapper.read({ input: `{"foo":"bar` }), {} )
		})
	})

})
