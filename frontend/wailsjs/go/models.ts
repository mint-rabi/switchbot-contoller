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

}

