function pipe_together(a, b) {
	return (...args) => b(a(...args))
}


function pipe(fns) {
	return fns.reduce(pipe_together)
}




module.exports = pipe
