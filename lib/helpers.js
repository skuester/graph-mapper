const _ = require('lodash')

const HTML_TAGS = /(<([^>]+)>)/ig


module.exports = {
	pipe,
	defaults_to,
	not_null,
	join,
	strip_html,
	iso_date,
	transform,
	boolean,
	boolean_from_int,
	opposite_boolean_from_int,
	number,
	json_parse,
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


function transform(source_to_target) {
	let target_to_source = _.invert(source_to_target)
	return {
		read: (value) => source_to_target[value] || null,
		write: (value) => target_to_source[value] || null,
	}
}


function boolean(key) {
	return {
		read: v => !!v
	}
}

function boolean_from_int() {
	return {
		read: (source) => {
			if (source === 1) return true
			if (source === 0 ) return false
		},
		write: (value) => {
			if (value === true) return 1
			if (value === false) return 0
		}
	}
}


function opposite_boolean_from_int() {
	return {
		read: (source) => {
			if (source === 1) return false
			if (source === 0 ) return true
		},
		write: (value) => {
			if (value === true) return 0
			if (value === false) return 1
		}
	}
}



function number() {
	return {
		read: v => {
			if (isNaN(v * 1)) return
			return v * 1
		}
	}
}



function json_parse(opts) {
	let read = (value) => JSON.parse(value)

	if (opts && opts.graceful) {
		read = (value) => {
			try {
				return JSON.parse(value)
			}
			catch (err) {
				return
			}
		}
	}

	return {
		read,
		write: (value) => JSON.stringify(value),
	}
}
