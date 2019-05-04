const assert = require('assert')
const { GraphMapper } = require('./graph-mapper')
const {
	value,
	pipe,
	not_null,
} = require('./helpers')


function test_read(helper_example, source_value, target_value) {
	let mapper = new GraphMapper({
		to: {
			target_path: helper_example
		}
	})
	assert.deepEqual( mapper.read({source_path: source_value}).target_path, target_value )
}


function test_read(helper_example, target_value, source_value) {
	let mapper = new GraphMapper({
		to: {
			target_path: helper_example
		}
	})
	assert.deepEqual( mapper.write({source_path: source_value}).target_path, target_value )
}



describe('GraphMapper helper functions', function () {

	describe('value()', function () {
		it ("is the default reader and writer", function () {
			let mapper = new GraphMapper({
				to: {
					a_target: value('a_source')
				}
			})
			assert.deepStrictEqual( mapper.read({ a_source: 'value'}), { a_target: 'value' })
			assert.deepStrictEqual( mapper.write({ a_target: 'value'}), { a_source: 'value' })
		})

		it ("can use a default value on read if the source is undefined", function () {
			let mapper = new GraphMapper({
				to: {
					a_target: value('a_source', 'some default value')
				}
			})
			assert.deepStrictEqual( mapper.read({ a_source: null}), { a_target: null })
			assert.deepStrictEqual( mapper.read({ a_source: undefined}), { a_target: 'some default value' })
		})
	})


	describe ('not_null()', function () {
		it ("can be used as a pipe before another helper, to filter out nulls and turn them into undefined", function () {
			let mapper = new GraphMapper({
				to: {
					a_target: not_null(value('a_source', 'some default value')),
				}
			})
			assert.deepStrictEqual( mapper.read({ a_source: null}), { a_target: 'some default value' })
			assert.deepStrictEqual( mapper.read({ a_source: undefined}), { a_target: 'some default value' })
		})
	})

})
