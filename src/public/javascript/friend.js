function main() {
	const addFriend = document.querySelector('#add-friend');
	addFriend.addEventListener('click', function() {
		addFriend.children[0].value = 'friend added!';
	});
}

document.addEventListener('DOMContentLoaded', main);