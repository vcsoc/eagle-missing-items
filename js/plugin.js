const path = require('path');
const fs = require('fs');
const os = require('os');
const settingspath = os.homedir() + '/missingfile.json';
const showdownPath = path.join(__dirname, 'js', 'showdown.min.js');
const md = require(showdownPath);
const eventNewTab = new Event('openTab');

eagle.onPluginCreate((plugin) => {
	progress(`
	Welcome to the Missing Files extension.<br>
	<b>This is a beta version.</b><br>
	All questions and/or suggestions can be sent to vceng@outlook.com.<br>
	${(new Date()).toLocaleString()} ---------------------------------- <br>
	`, `Yellow`, false);
});

eagle.onPluginShow(() => {
});

eagle.onPluginRun(async () => {
	await gettnc();
	await LoadSettings();
	setTab();
});

eagle.onPluginHide(() => {
});

eagle.onPluginBeforeExit((event) => {
});

eagle.onLibraryChanged(async (libraryPath) => {
	if (document.getElementById('chkAutoScanOnLibChange').checked) {
		await processMissingFiles();
	} else {
		progress(` Consider scanning for missing items in <b><i>${path.basename(libraryPath)}</i></b>.`, 'Orange', true);
	}
});

//---------------------------------------------------------------

function setTab() {
	// Create a new click event
	var newClickEvent = new Event('click');

	// Select the element you want to trigger the click event on
	var element = document.getElementById('tabInspector');

	// Dispatch the click event on the selected element
	element.dispatchEvent(newClickEvent);
}

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
	progress(' Looking for missing files, please be patient.', 'LightGreen', true);

	try {
		let folder = (await eagle.folder.getSelected())[0];
		let items = [];
		if (folder != null && !allItems) {
			items = await getItemsRecursively(folder.id);
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
	await processMissingFiles();
}

async function gettnc() {
	// Function to fetch Markdown content from file
	function fetchMarkdownFile(filePath) {
		return fetch(filePath)
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to fetch Markdown file');
				}
				return response.text();
			})
			.catch(error => {
				console.error('Error fetching Markdown file:', error);
			});
	}

	// Function to convert Markdown to HTML
	function convertMarkdownToHTML(markdownContent) {
		var converter = new md.Converter();
		return converter.makeHtml(markdownContent);
	}

	// Function to load Markdown content into the "message" div
	function loadMarkdownIntoDiv(markdownHTML) {
		const tncDiv = document.getElementById('tnc');
		tncDiv.innerHTML = markdownHTML;
	}

	// File path to your Markdown file
	const markdownFilePath = path.join(__dirname, 'tnc.md'); //'path/to/your/markdown/file.md';

	// Fetch Markdown content from file, convert to HTML, and load into the "message" div
	fetchMarkdownFile(markdownFilePath)
		.then(markdownContent => {
			const markdownHTML = convertMarkdownToHTML(markdownContent);
			loadMarkdownIntoDiv(markdownHTML);
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
}

//---------------------------------------------------------------

