const _ = require('lodash')

const HTML_TAGS = /(<([^>]+)>)/ig


module.exports = {
	pipe,
	defaults_to,
	not_null,
	join,
	strip_html,
	iso_date,
}




function pipe(path, ...fns)	{
	if (!fns.length) {
		return { from: path }
	}

	return {
		from: path,
		read: fns.map(f => f.read || pass_thru),
		write: fns.reverse().map(f => f.write || pass_thru)
	}
}


function defaults_to(def_value) {
	return {
		read: value => (typeof value === 'undefined') ? def_value : value,
	}
}



function not_null() {
	return {
		read: value => value == null ? undefined : value,
	}
}




function join(join_with = " ") {
	return {
		read: (...source_values) => source_values.filter(v => !!v).join(join_with) || undefined,
		write: (value) => value && value.split(join_with)
	}
}



function strip_html() {
	return {
		read: (source_value) => (source_value && source_value.replace(HTML_TAGS, '')) || null
	}
}


function iso_date() {
	return {
		read: (source_value) => source_value && new Date(Date.parse(source_value)).toISOString()
	}
}


function pass_thru(v) { return v }

// 	transform(key, source_to_target_value) {
// 		return {
// 			from: [key],
// 			read: when_defined((source_value) => source_to_target_value[source_value])
// 		}
// 	},

// 	transform_with_write(key, source_to_target_value) {
// 		let inverse_target = _.invert(source_to_target_value)
// 		return {
// 			from: [key],
// 			read: when_defined((source_value) => source_to_target_value[source_value]),
// 			write: when_defined((source_value) => inverse_target[source_value])
// 		}
// 	},

// 	value(key, default_value) {
// 		return {
// 			from: [key],
// 			read: (source_value) => (typeof source_value === 'undefined') ? default_value : source_value,
// 			write: value => value
// 		}
// 	},

// 	boolean(key) {
// 		return {
// 			from: [key],
// 			read: when_defined((source_value) => !!source_value),
// 			write: value => value
// 		}
// 	},

// 	boolean_from_int(key) {
// 		return {
// 			from: [key],
// 			read: (source) => {
// 				if (source === 1) return true
// 				if (source === 0 ) return false
// 			},
// 			write: (value) => {
// 				if (value === true) return 1
// 				if (value === false) return 0
// 			}
// 		}
// 	},

// 	opposite_from_int(key) {
// 		return {
// 			from: [key],
// 			read: (source) => {
// 				if (source === 1) return false
// 				if (source === 0) return true
// 			},
// 			write: (value) => value ? 0 : 1,
// 		}
// 	},




// 	number(key) {
// 		return {
// 			from: [key],
// 			read: when_defined((source_value) => source_value * 1)
// 		}
// 	},


// 	int(key) {
// 		return {
// 			from: [key],
// 			read: when_defined(parseInt)
// 		}
// 	},


// 	float(key) {
// 		return {
// 			from: [key],
// 			read: when_defined(parseFloat)
// 		}
// 	},



// 	json_parse(key) {
// 		return {
// 			from: [key],
// 			read: (source_value) => source_value && JSON.parse(source_value)
// 		}
// 	},



// 	not_null(config) {
// 		config.read = $pipe(
// 			(value) => value == null ? undefined : value,
// 			config.read
// 		)

// 		return config
// 	},


// 	pipe,
// 	defaults_to,
// 	not_null,
// }



// function pipe(key, ...fns) {
// 	let read = fns.reduce((read, fn) => {
// 		return (value) => fn.read(read(value))
// 	}, v => v)

// 	return {
// 		from: key,
// 		read,
// 	}
// }





// function $pipe(f, g) {
// 	return a => g(f(a))
// }






// function when_defined(fn) {
// 	return function (source_value) {
// 		if (typeof source_value === 'undefined') return
// 		return fn(source_value)
// 	}
// }
