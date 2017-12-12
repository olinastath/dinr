function changeToRegister() {
	const registerButton = document.getElementById('register-button');
	const registerForm = document.getElementById('register-form');
	const loginButton = document.getElementById('login-button');
	const loginForm = document.getElementById('login-form');

	registerButton.style.backgroundColor = '#cc0000';
	registerButton.style.color = 'white';
	
	loginButton.style.backgroundColor = '#d3d3d3';
	loginButton.style.color = '#3f3f3f';
	
	loginForm.style.display = 'none';
	registerForm.style.display = 'block';
}

function changeToLogin() {
	const registerButton = document.getElementById('register-button');
	const registerForm = document.getElementById('register-form');
	const loginButton = document.getElementById('login-button');
	const loginForm = document.getElementById('login-form');

	loginButton.style.backgroundColor = '#cc0000';
	loginButton.style.color = 'white';
	
	registerButton.style.backgroundColor = '#d3d3d3';
	registerButton.style.color = '#3f3f3f';
	
	registerForm.style.display = 'none';
	loginForm.style.display = 'block';
}

function main() {
	const registerButton = document.getElementById('register-button');
	registerButton.addEventListener('click', changeToRegister);
	const loginButton = document.getElementById('login-button');
	loginButton.addEventListener('click', changeToLogin);
	const position = navigator.geolocation.getCurrentPosition();
	console.log(position);
}

document.addEventListener('DOMContentLoaded', main);