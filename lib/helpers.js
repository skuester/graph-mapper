const _ = require('lodash')

const HTML_TAGS = /(<([^>]+)>)/ig


module.exports = {

	transform(key, source_to_target_value) {
		return {
			from: [key],
			read: when_defined((source_value) => source_to_target_value[source_value])
		}
	},

	transform_with_write(key, source_to_target_value) {
		let inverse_target = _.invert(source_to_target_value)
		return {
			from: [key],
			read: when_defined((source_value) => source_to_target_value[source_value]),
			write: when_defined((source_value) => inverse_target[source_value])
		}
	},

	value(key, default_value) {
		return {
			from: [key],
			read: (source_value) => (typeof source_value === 'undefined') ? default_value : source_value,
			write: value => value
		}
	},

	boolean(key) {
		return {
			from: [key],
			read: when_defined((source_value) => !!source_value),
			write: value => value
		}
	},

	boolean_from_int(key) {
		return {
			from: [key],
			read: (source) => {
				if (source === 1) return true
				if (source === 0 ) return false
			},
			write: (value) => {
				if (value === true) return 1
				if (value === false) return 0
			}
		}
	},

	opposite_from_int(key) {
		return {
			from: [key],
			read: (source) => {
				if (source === 1) return false
				if (source === 0) return true
			},
			write: (value) => value ? 0 : 1,
		}
	},

	join(keys, join_with = " ") {
		return {
			from: keys,
			read: (...source_values) => source_values.filter(v => !!v).join(join_with) || undefined,
			write: (value) => value && value.split(join_with)
		}
	},


	iso_date(key) {
		return {
			from: [key],
			read: (source_value) => source_value && Date.parse(source_value).toISOString()
		}
	},


	number(key) {
		return {
			from: [key],
			read: when_defined((source_value) => source_value * 1)
		}
	},


	int(key) {
		return {
			from: [key],
			read: when_defined(parseInt)
		}
	},


	float(key) {
		return {
			from: [key],
			read: when_defined(parseFloat)
		}
	},

	strip_html(key, default_value = null) {
		return {
			from: [key],
			read: when_defined(source_value => (source_value && source_value.replace(HTML_TAGS, '')) || default_value)
		}
	},

	json_parse(key) {
		return {
			from: [key],
			read: (source_value) => source_value && JSON.parse(source_value)
		}
	},



	not_null(config) {
		config.read = $pipe(
			(value) => value == null ? undefined : value,
			config.read
		)

		return config
	},


	pipe,
	defaults_to,
	not_null,
}



function pipe(key, ...fns) {
	let read = fns.reduce((read, fn) => {
		return (value) => fn.read(read(value))
	}, v => v)

	return {
		from: key,
		read,
	}
}

function not_null() {
	return {
		read: value => value == null ? undefined : value,
		write: value => value,
	}
}

function defaults_to(def_value) {
	return {
		read: value => (typeof value === 'undefined') ? def_value : value,
		write: value => value,
	}
}



function $pipe(f, g) {
	return a => g(f(a))
}






function when_defined(fn) {
	return function (source_value) {
		if (typeof source_value === 'undefined') return
		return fn(source_value)
	}
}
