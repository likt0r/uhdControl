const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
//const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;
const Shell = imports.gi.Shell;
const Util = imports.misc.util;
let text, button;

function _isFound(str) {
  var f = false;
  for (var i = 0; i < str.length; i++) {
    if (str[i] == '~') {
      f = true;
    }
  }

  if (f) {
    let re = /~/gi;
    let s = str.replace(re, GLib.get_home_dir());
    return [f, s];
  } else {
    return [f, str];
  }
}

function _toUtfArray(str) {
  let [f, s2] = this._isFound(str);
  let arr = s2.split(' ');

  return arr;
}

function doCommand(command) {
  let [res, out] = GLib.spawn_sync(null, this._toUtfArray(command), null, GLib.SpawnFlags.SEARCH_PATH, null);

  if (out == null) {
    return 'Error executing command.';
  } else {
    return out.toString();
  }
}

function setScaleFactory(deviceList, device, scale) {
  let panValues = deviceList.reduce(
    (acc, val) => {
      let factor = val.id == device.id ? scale : 1;
      acc.width = Math.max(acc.width, device.x + device.width * factor);
      acc.heigth = Math.max(acc.heigth, device.y + device.heigth * factor);
      return acc;
    },
    { width: 0, height: 0 }
  );
  return function(event) {
    doCommand(
      'xrandr --output ' +
        device.id +
        ' --scale ' +
        scale +
        'x' +
        scale +
        ' --panning ' +
        parseInt(panValues.width) +
        'x' +
        parseInt(panValues.height)
    );
  };
}

const MyPanelObject = new Lang.Class({
  Name: 'uhd Helper',
  Extends: PanelMenu.Button,
  _convertInfo: function(strg) {
    let deviceInfo = strg.split(/\s+/);
    let wh = deviceInfo[3].split('x');
    let pos = wh[1]
      .split('/')[1]
      .split('+')
      .slice(1);
    return {
      width: parseInt(wh[0].split('/')[0]),
      height: parseInt(wh[1].split('/')[0]),
      x: parseInt(pos[0]),
      y: parseInt(pos[1]),
      id: deviceInfo[4],
    };
  },
  _init: function() {
    //Call the super-class
    this.parent(St.Align.START);

    //Add the label actor
    this.buttonText = new St.Label({ text: 'uhdControl' });
    this.actor.add_actor(this.buttonText);
    let result = doCommand('xrandr --listmonitors');
    result = result.split('\n');
    result.shift();
    result.pop();
    let deviceList = result.map(this._convertInfo);
    deviceList.forEach((device, index) => {
      let submenu = new PopupMenu.PopupSubMenuMenuItem('' + device.id);
      this.menu.addMenuItem(submenu);

      submenu.menu.addAction('0.5', setScaleFactory(deviceList, device, 0.5));
      submenu.menu.addAction('1.0', setScaleFactory(deviceList, device, 1.0));
      submenu.menu.addAction('1.5', setScaleFactory(deviceList, device, 1.5));
      submenu.menu.addAction('2.0', setScaleFactory(deviceList, device, 2.0));
    });
  },
});

function init() {}

let MyObject;

function enable() {
  MyObject = new MyPanelObject();
  Main.panel.addToStatusArea('SamplePanelButton', MyObject);
}

function disable() {
  if (MyObject) {
    MyObject.destroy();
    MyObject = null;
  }
}
