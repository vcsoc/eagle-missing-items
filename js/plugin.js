const path = require('path');
const fs = require('fs');
const os = require('os');
const settingspath = os.homedir() + '/missingfile.json';

eagle.onPluginCreate((plugin) => {
	console.log('MissingFiles_>>_eagle.onPluginCreate');
	//eagle.log.debug(plugin);
	// document.querySelector('#message').innerHTML = `
	// <ul>
	// 	<li>id: ${plugin.manifest.id}</li>
	// 	<li>version: ${plugin.manifest.version}</li>
	// 	<li>name: ${plugin.manifest.name}</li>
	// 	<li>logo: ${plugin.manifest.logo}</li>
	// 	<li>path: ${plugin.path}</li>
	// </ul>
	// `;
	// console.log(plugin.manifest.name);
	// console.log(plugin.manifest.version);
	// console.log(plugin.manifest.logo);
	// console.log(plugin.path);

	//document.querySelector('#message').innerHTML = 'Looking for missing files...';
	progress(`
	Welcome to the Missing Files extension.<br>
	<b>This is a beta version.</b><br>
	All questions and/or suggestions can be sent to vceng@outlook.com.<br>
	${(new Date()).toLocaleString()} ---------------------------------- <br>
	`, `Yellow`, false);
});

eagle.onPluginShow(() => {
	console.log('MissingFiles_>>_eagle.onPluginShow');
	//console.log.clear();
});

eagle.onPluginRun(async () => {
	console.log('MissingFiles_>>_eagle.onPluginRun');

	await gettnc();
	await LoadSettings();
	//await processMissingFiles();

});

eagle.onPluginHide(() => {
	eagle.log.debug('MissingFiles_>>_eagle.onPluginHide');
});

eagle.onPluginBeforeExit((event) => {
	eagle.log.debug('MissingFiles_>>_eagle.onPluginBeforeExit');
});

eagle.onLibraryChanged(async (libraryPath) => {
	console.log(`Resource library switch detected, new resource library path: ${libraryPath}`);

	if (document.getElementById('chkAutoScanOnLibChange').checked) {
		await processMissingFiles();
	} else {
		progress(` Consider scanning for missing items in <b><i>${path.basename(libraryPath)}</i></b>.`, 'Orange', true);
	}

	// let result = await eagle.dialog.showMessageBox({
	// 	title: "Library Changed",
	// 	message: "You have changed the library in eagle. Would you like to rerun the check for missing items?",
	// 	detail: "Have a coffee break!",
	// 	buttons: ["OK", "Cancel"],
	// 	type: "info"
	// });

	// if (result.response === 0) {
	// 	progress(' ----------------------------------', undefined, true);
	// 	progress(' Looking for missing files, please be patient.', 'Red');
	// 	await processMissingFiles();
	// }
});

//---------------------------------------------------------------

function openTab(evt, tabName) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tabName).style.display = "block";
	evt.currentTarget.className += " active";
}

//---------------------------------------------------------------

async function progress(message, color = 'white', timestamp = false) {

	if (eagle.app.isDarkColors()) {
		document.querySelector('#message').style.color = 'white';
		document.querySelector('#message').style.font = "12px arial, serif";
	}

	let html = "";
	if (document.querySelector('#message').style.color != color) {
		html = `<font color="${color}">${message}</font>`;
	} else {
		html = `${message}`;
	}

	timestamp ? html = `${(new Date()).toLocaleString()} - ` + html : "";
	console.log(html);

	document.querySelector('#message').innerHTML += `${html}<br>`;
	await scrollToBottom('message');
}

async function getItemsRecursively(folderId) {
	let folder = await eagle.folder.getById(folderId);
	console.log(`	>> checking for missing items under folder \"${folder.name}\" (id: ${folderId})`);
	let items = await eagle.item.get({
		folders: [folderId]
	});

	// Recurse into subfolders (if any)
	let children = folder.children;
	//console.log(children);
	if (children && children.length > 0) {
		//console.log(`	>> iterating ${children.length} subfolders.`);
		for (let child of children) {
			//console.log(`	>> extracting items for subfolder \"${child.name}\"`);
			items.push(...await getItemsRecursively(child.id));
		}
	}

	return items;
}

let cnt = 0;
async function processMissingFiles(allItems = false) {
	let mftag = "missingfile";
	let idxtotal = 0;
	let idx = 0;
	cnt = 0;

	//progress(' ----------------------------------', undefined, true);
	progress(' Looking for missing files, please be patient.', 'LightGreen', true);

	try {
		let folder = (await eagle.folder.getSelected())[0];
		let items = [];
		if (folder != null && !allItems) {
			items = await getItemsRecursively(folder.id);
			console.log(`	>> ${items.length} items found recursively.`);
			progress(`Looking for missing files in \"${folder.name}\" folder(s).`);
		} else {
			items = await eagle.item.getAll();
			progress(`Looking for missing files in all folders.`);
		}

		if (Array.isArray(items)) {
			for (let item in items) {
				++idxtotal;
				let i = items[item];
				if (i.tags.includes(mftag)) {
					++idx;
					progress(`  ${i.id} already tagged. Check for files with the \"missingfile\" tag.`);
				} else {
					let filePath = items[item]["filePath"];
					fs.access(filePath, fs.constants.F_OK, async (err) => {
						if (err) {
							++idx;
							progress(`   Tagging item ${idx} :: ${path.basename(filePath)} (${i.id})`);
							i.tags.push('missingfile');
							i.save();
							//await eagle.item.remove(i.id);
							console.log(`   File does not exist at ${filePath} (${i.id})`);
						} else {
							//console.log('File exists at ', filePath);
						}
					});
				}
			}
		}
	} catch (error) {
		progress(`${error}`, 'red');
	} finally {
		progress(`   Analysed ${idxtotal} files.${idx > 0 ? " Check for files with the \"missingfile\" tag." : ""} `, '#BC64F9', true);
	}

}

//---------------------------------------------------------------

async function myAsyncFunction() {
	// Your async function goes here.
	//console.log('Async function triggered!');
	await processMissingFiles();
}

async function gettnc() {

	// Define the path to the file
	const filePath = path.join(__dirname, 'tnc.txt');
	console.log(filePath);

	// Read the file
	fs.readFile(filePath, 'utf8', function (err, data) {
		if (err) {
			console.error("Error reading file:", err);
			return;
		}

		// Update the div with id "message" with the file content
		document.querySelector('#tnc').innerHTML = `${data}`;
	});

}

async function scrollToBottom(divId) {
	var div = document.getElementById(divId);
	div.scrollTop = div.scrollHeight;
}

//---------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {

	document.getElementById('btnScan').addEventListener('click', async function () {
		if (document.getElementById('chkTncAccept').checked) {
			await myAsyncFunction();
		} else {
			console.log('TnC checkbox is not checked.');
			//progress(' ----------------------------------', undefined, true);
			progress(' You need to read and agree to the terms and conditions before you can continue.', 'Red', true);
		}
	});

	document.getElementById('btnSettingsSave').addEventListener('click', async function () {
		await SaveSettings();
	});

	document.getElementById('btnSettingsDefault').addEventListener('click', async function () {
		await LoadSettings();
	});
});

//---------------------------------------------------------------

async function SaveSettings() {
	fs.access(settingspath, fs.F_OK, (err) => {
		if (err) {
			console.error('File does not exist, creating file');
			fs.writeFile(settingspath, '', (err) => {
				if (err) throw err;
				console.log('File created');
			});
		} else {
			console.log('File exists');
		}
	});

	let data = {
		autoScanOnLibChange: document.getElementById('chkAutoScanOnLibChange').checked,
		tncAccept: document.getElementById('chkTncAccept').checked
	};
	fs.writeFileSync(settingspath, JSON.stringify(data));
	console.log(`Saved settings to ${settingspath}`);
}

async function LoadSettings() {
	let rawdata;
	if (fs.existsSync(settingspath)) {
		// If the file exists, read it
		rawdata = fs.readFileSync(settingspath);

	} else {
		// If the file doesn't exist, initialize rawdata as an empty object or with default values
		rawdata = JSON.stringify({
			autoScanOnLibChange: false, // default value
			tncAccept: false // default value
		});
	}

	let settings = JSON.parse(rawdata);
	document.getElementById('chkAutoScanOnLibChange').checked = settings.autoScanOnLibChange;
	document.getElementById('chkTncAccept').checked = settings.tncAccept;

	console.log(`Loaded default settings.`);

}

//---------------------------------------------------------------

