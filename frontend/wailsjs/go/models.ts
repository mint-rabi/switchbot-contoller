export namespace main {
	
	export class CredentialStatus {
	    configPath: string;
	    exists: boolean;
	    saved: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new CredentialStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.configPath = source["configPath"];
	        this.exists = source["exists"];
	        this.saved = source["saved"];
	        this.error = source["error"];
	    }
	}
	export class SwitchBotDevice {
	    deviceId: string;
	    deviceName: string;
	    deviceType: string;
	    hubDeviceId: string;
	    enableCloudService?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SwitchBotDevice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deviceId = source["deviceId"];
	        this.deviceName = source["deviceName"];
	        this.deviceType = source["deviceType"];
	        this.hubDeviceId = source["hubDeviceId"];
	        this.enableCloudService = source["enableCloudService"];
	    }
	}
	export class SwitchBotInfraredRemote {
	    deviceId: string;
	    deviceName: string;
	    remoteType: string;
	    hubDeviceId: string;
	
	    static createFrom(source: any = {}) {
	        return new SwitchBotInfraredRemote(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.deviceId = source["deviceId"];
	        this.deviceName = source["deviceName"];
	        this.remoteType = source["remoteType"];
	        this.hubDeviceId = source["hubDeviceId"];
	    }
	}
	export class SwitchBotDeviceList {
	    devices: SwitchBotDevice[];
	    infraredRemotes: SwitchBotInfraredRemote[];
	    cachedAt: string;
	    cached: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SwitchBotDeviceList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.devices = this.convertValues(source["devices"], SwitchBotDevice);
	        this.infraredRemotes = this.convertValues(source["infraredRemotes"], SwitchBotInfraredRemote);
	        this.cachedAt = source["cachedAt"];
	        this.cached = source["cached"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SwitchBotScene {
	    sceneId: string;
	    sceneName: string;
	
	    static createFrom(source: any = {}) {
	        return new SwitchBotScene(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sceneId = source["sceneId"];
	        this.sceneName = source["sceneName"];
	    }
	}
	export class SwitchBotSceneList {
	    scenes: SwitchBotScene[];
	    cachedAt: string;
	    cached: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SwitchBotSceneList(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scenes = this.convertValues(source["scenes"], SwitchBotScene);
	        this.cachedAt = source["cachedAt"];
	        this.cached = source["cached"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

