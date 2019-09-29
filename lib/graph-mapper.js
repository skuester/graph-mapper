const _ = require('lodash')
const helpers = require('./helpers')
const pipe = require('./pipe')


class GraphMapper {
	constructor(config) {
		this.config = config
		this.property_mappers = []
		this.root_source_path = config.from
		this.property_mappers_index = {}
		this.default_value = config.default_value
		this.ctor = config.constructor || pass_thru

		for (let path in config.to) {
			let pmapper = build_path_mapper(path, config.to[path], this.root_source_path)
			this.property_mappers.push(pmapper)
			this.property_mappers_index[path] = pmapper
		}
	}


	read(source, opts) {
		if (!_.isObject(source) || _.isArray(source)) return

		let target = {}

		this.property_mappers.forEach(prop => {
			prop.read(source, target, opts)
		})

		if (opts && opts.prevent_empty_target && _.every(Object.values(target), v => v == null)) return this.default_value

		return new this.ctor(target)
	}


	write(target) {
		if (!_.isObject(target) || _.isArray(target)) return

		let source = {}

		this.property_mappers.forEach(prop => {
			prop.write(target, source)
		})

		return source
	}


	// TODO: improve performance, especially consider the simple case, such as ['name']
	source_list(target_paths) {
		if (target_paths) {
			return this.pick(target_paths).source_list()
		}
		return this.property_mappers.reduce((list, pmap) => list.concat(pmap.source_list()), [])
	}


	source_tree(target_paths) {
		return get_source_tree_for_node(path_list_to_tree(this.source_list(target_paths)))
	}


	extend(config) {
		return new GraphMapper(_.merge({}, this.config, config))
	}


	pick(target_paths) {
		let config = {from: this.config.from, to: {}}

		let missing = new MissingPathReducer()

		target_paths.forEach(path => {
			if (this.config.to[path]) {
				config.to[path] = this.config.to[path]
			}
			else {
				missing.push(path)
			}
		})

		for (let key in missing.paths) {
			if (this.property_mappers_index[key]) {
				let child_mapper = this.property_mappers_index[key].mapper().pick(missing.paths[key])

				config.to[key] = Object.assign({}, this.config.to[key], {
					mapper: () => child_mapper
				})
			}
			else {
				throw new Error(`GraphMapper: The target path {${key}} does not exist.`)
			}
		}

		return new GraphMapper(config)
	}
}







class PropertyMapper  {
	constructor(target_path, config, root_source_path) {
		config = normalize_property_mapper_config(config)

		this.target_path = target_path
		this.source_paths = to_array(config.from).map(source_path => {
			return (source_path === '=') ? this.target_path : source_path
		})
		this.read_pipe = config.read ? pipe([].concat(config.read)) : pass_thru
		this.write_pipe = config.write ? pipe([].concat(config.write)) : pass_thru

		if (root_source_path) {
			this.source_paths = this.source_paths.map(source_path => `${root_source_path}.${source_path}`)
		}
	}

	read(source, target) {
		assign(target, this.target_path, this.read_pipe(...this.read_value(source)))
	}

	read_value(source) {
		return this.source_paths.map(p => _.get(source, p))
	}

	write_value(target) {
		return _.get(target, this.target_path)
	}

	source_list() {
		return this.source_paths
	}

}


class SingleSourcePropertyMapper extends PropertyMapper {
	write(target, source) {
		let source_value = this.write_pipe(this.write_value(target))
		assign(source, this.source_paths[0], source_value)
	}
}

class MultiSourcePropertyMapper extends PropertyMapper {
	write(target, source) {
		let source_value = this.write_pipe(this.write_value(target))
		to_array(source_value).forEach((value, i) => {
			assign(source, this.source_paths[i], value)
		})
	}
}



// NOTE: in this case, very hard to tell the difference between config.from and root source path
class ArrayMapper {
	constructor(target_path, config, root_source_path) {
		this.mapper = new GraphMapper({ to: config.to })
		this.target_path = target_path
		this.config = config
		this.root_source_path = root_source_path
		// DUP with child mapper
		this.to_source_path = this.root_source_path ? p => `${this.root_source_path}.${p}` : pass_thru
	}

	read(source, target, opts) {
		let value = _.get(this._get_source(source), this.config.from).map(item => this.mapper.read(item, opts))
		assign(target, this.target_path, value)
	}

	write(target, source) {
		let value = _.get(target, this.target_path)
		assign(this._get_write_source(source), this.config.from, value.map(item => this.mapper.write(item)))
	}

	// same as ChildMapper
	_get_source(source) {
		return (this.root_source_path) ? _.get(source, this.root_source_path) : source
	}

	_get_write_source(source) {
		if (this.root_source_path) {
			return source[this.root_source_path] = (source[this.root_source_path] || {})
		}
		return source
	}

	source_list() {
		let list = this.mapper.source_list().map(p => this.config.from + '.' + p)
		return [this.config.from + '.$__array'].concat(list)
	}
}


class ChildMapper {
	constructor(target_path, config, root_source_path) {
		this.target_path = target_path
		this.root_source_path = root_source_path
		this.mapper = config.mapper || _.once(() => new GraphMapper(config))
		this.to_source_path = this.root_source_path ? p => `${this.root_source_path}.${p}` : pass_thru
		this.starts_with_target_path = new RegExp(`^${this.target_path}\.`)
		this.get_mapper = _.once(this.mapper)
	}


	read(source, target, opts) {
		let read_value = this.mapper().read(this._get_source(source), opts)
		assign(target, this.target_path, read_value)
	}


	write(target, source) {
		let value = this.mapper().write(_.get(target, this.target_path))

		if (this.root_source_path) {
			source[this.root_source_path] = Object.assign(source[this.root_source_path] || {}, value)
		}
		else {
			Object.assign(source, value)
		}
	}


	source_list() {
		return this.get_mapper().source_list().map(p => this.to_source_path(p))
	}

	_get_source(source) {
		return (this.root_source_path) ? _.get(source, this.root_source_path) : source
	}

	_translate_picked_paths(picked_paths) {
		return picked_paths.map(p => p.replace(this.starts_with_target_path, ''))
	}
}








function build_path_mapper(path, config, root_source_path) {
	dev_check_common_errors(config)

	if (config.array) {
		return new ArrayMapper(path, config, root_source_path)
	}
	else if (config.to || config.mapper) {
		return new ChildMapper(path, config, root_source_path)
	}
	else if (_.isArray(config.from)) {
		return new MultiSourcePropertyMapper(path, config, root_source_path)
	}
	else {
		return new SingleSourcePropertyMapper(path, config, root_source_path)
	}
}




function dev_check_common_errors(config) {
	if (process.NODE_ENV === 'production') return
	if (config.to && typeof config.to.mapper === 'function') throw new Error(`Don't use the 'to' property with mapper.use(). Correct is: my_output: mapper.use(...)`)
	if (config.to && _.isArray(config.from)) throw new Error(`Don't use the 'to' property with multiple 'from' sources. You can only nest under a single source.`)
}













function pass_thru(value) { return value }


function to_array(value_or_array) {
	return [].concat(value_or_array)
}

function get_source_tree_for_node(node, output) {
	var output = {}, key

	for (key in node) {
		if (key === '$__array') {
			output.array = true
		}
		else if (node[key] === true) {
			output.fields = output.fields || []
			output.fields.push(key)
		}
		else {
			output.from = output.from || {}
			output.from[key] = get_source_tree_for_node(node[key])
		}
	}

	return output
}


function path_list_to_tree(path_list) {
	var tree = {}

	path_list.forEach(path => {
		_.set(tree, path, true)
	})

	return tree
}


function assign(obj, path, value) {
	if(typeof value !== 'undefined') {
		_.set(obj, path, value)
	}
}



function normalize_property_mapper_config(config) {
	if (_.isString(config)) {
		config = { from: config }
	}

	return config
}



class MissingPathReducer {
	constructor() {
		this.paths = {}
	}

	push(path) {
		let parts = path.split('.')
		let list = this.paths[parts[0]] || []
		this.paths[parts[0]] = list.concat(parts.slice(1).join('.'))
	}
}


class GraphMapperRegistry {
	constructor() {
		this.mappers = {}
	}

	get(name) {
		let mapper = this.mappers[name]
		if (!mapper) throw new Error(`No mapper defined for '${name}'`)
		return mapper
	}

	// returns a graph mapper path config
	use(name, opts) {
		return {
			mapper: _.once(() => {
				let other_mapper = this.get(name)
				return opts ? other_mapper.extend(opts) : other_mapper
			})
		}
	}

	define(name, config) {
		this.mappers[name] = new GraphMapper(config)
	}
}





GraphMapper.Registry = GraphMapperRegistry

module.exports = { GraphMapper, helpers }
