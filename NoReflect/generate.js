const templateClassdef = `
//CLASSDEF FOR %classname%
BaseData reflect_%classname% = new ModData();

ArrayList<BaseData> reflect_%classname%_constructors = new ArrayList<BaseData>();
%constructordefs%
BaseData[] reflect_%classname%_constructors_arr = new BaseData[reflectProfiles.size()];
for (int i = 0; i < reflect_%classname%_constructors_arr.length; i++) {
    reflect_%classname%_constructors_arr[i] = reflect_%classname%_constructors.get(i);
}

ArrayList<BaseData> reflect_%classname%_methods = new ArrayList<BaseData>();
%methoddefs%
BaseData[] reflect_%classname%_methods_arr = new BaseData[reflectProfiles.size()];
for (int i = 0; i < reflect_%classname%_methods_arr.length; i++) {
    reflect_%classname%_methods_arr[i] = reflect_%classname%_methods.get(i);
}

reflect_%classname%.set("constructors", reflect_%classname%_constructors_arr);
reflect_%classname%.set("methods", reflect_%classname%_methods_arr);
reflect_%classname%.set("className", "%classname%");
reflect_%classname%.set("class", %classname%.class);
reflectProfiles.add(reflect_%classname%);

`;
//IXCVVIX
//CXVIIVX
//MVVMCXI
const templateConstructor = `
BaseData reflect_%classname%_constructor_%constructorname%_%idx% = new ModData();
reflect_%classname%_constructor_%constructorname%_%idx%.set("returnType", %returntype%);
reflect_%classname%_constructor_%constructorname%_%idx%.set("argnames", %argkeys%);
reflect_%classname%_constructor_%constructorname%_%idx%.set("argtypes", %argvalues%);
reflect_%classname%_constructors_%idx%.%constructorimpl%
reflect_%classname%_constructors.add(reflect_%classname%_constructor_%constructorname%_%idx%);

`;
const templateMethod = `
BaseData reflect_%classname%_method_%methodname%_%idx% = new ModData();
reflect_%classname%_method_%methodname%_%idx%.set("methodName", "%methodname%");
reflect_%classname%_method_%methodname%_%idx%.set("returnType", %returntype%);
reflect_%classname%_method_%methodname%_%idx%.set("static", %static%);
reflect_%classname%_method_%methodname%_%idx%.set("argnames", %argkeys%);
reflect_%classname%_method_%methodname%_%idx%.set("argtypes", %argvalues%);
reflect_%classname%_method_%methodname%_%idx%.%methodimpl%
reflect_%classname%_methods.add(reflect_%classname%_method_%methodname%_%idx%);

`;
const templateManager = `
import net.eaglerforge.api.*;
import java.util.ArrayList;
public class PLReflect {
    public static ModData makeModData() {
        ModData plReflectGlobal = new ModData();
        ArrayList<BaseData> reflectProfiles = new ArrayList<BaseData>();
        %classdefs%
        BaseData[] reflectProfilesArr = new BaseData[reflectProfiles.size()];
        for (int i = 0; i < reflectProfilesArr.length; i++) {
            reflectProfilesArr[i] = reflectProfiles.get(i);
        }
        plReflectGlobal.set("classes", reflectProfilesArr);
        return plReflectGlobal;
    }
}`;
function wait(d) {
    return new Promise((res, rej)=>{
        setTimeout(()=>{res()}, d*1000);
    });
}
function logClear() {
    document.querySelector("#logs").innerText = "";
}
function logTxt(txt) {
    if (document.querySelector("#logs").innerText === "") {
        document.querySelector("#logs").innerText += txt;
    } else {
        document.querySelector("#logs").innerText += "\n" + txt;
    }
    document.querySelector("#logs").scrollTop = document.querySelector("#logs").scrollHeight;
}
function process(file, reader, classDataDump, className) {
    return new Promise((res, rej)=>{
        reader.addEventListener("load", ()=>{
            var output = reader.result;
            classDataDump[className] = (reconJ(output, className));
            res(output);
        });
        reader.readAsText(file);
    });
}
function createManagerFile(managerTemplate, config, zip, dataDump, classIdMap) {
    var manager = managerTemplate;
    var filePath = config.managerFile.replaceAll(".", "/") + ".java";

    for (let i = 0; i < config.targetFiles.length; i++) {
        manager = `import ${config.targetFiles[i]}` + ";\n" + manager;
    }
    var imports = [];

    var classText = "";
    var classes = Object.keys(dataDump);
    for (let i = 0; i < classes.length; i++) {
        const className = classes[i];
        imports = [...new Set(imports.concat(dataDump[className].usedClasses))];

        var tmpClassText = templateClassdef;
        tmpClassText = tmpClassText.replaceAll("%classname%", className);

        var constructorText = "";
        for (let i = 0; i < dataDump[className].constructors.length; i++) {
            const constructor = dataDump[className].constructors[i];
            var tmpConstructorText = templateConstructor;
            tmpConstructorText = tmpConstructorText.replaceAll("%classname%", className);
            tmpConstructorText = tmpConstructorText.replaceAll("%idx%", constructor.idx);
            tmpConstructorText = tmpConstructorText.replaceAll("%constructorname%", constructor.name);
            tmpConstructorText = tmpConstructorText.replaceAll("%returntype%", "\""+className+"\"");
            tmpConstructorText = tmpConstructorText.replaceAll("%argkeys%", `new String[]{${(()=>{
                var txt = "";
                var argumentKeys = Object.keys(constructor.arguments);
                for (let i = 0; i < argumentKeys.length; i++) {
                    const k = argumentKeys[i];
                    txt += `"${k}"`;
                    if (i !== argumentKeys.length - 1) {
                        txt += ", ";
                    }
                }
                return txt;
            })()}}`);
            tmpConstructorText = tmpConstructorText.replaceAll("%argvalues%", `new String[]{${(()=>{
                var txt = "";
                var argumentKeys = Object.keys(constructor.arguments);
                for (let i = 0; i < argumentKeys.length; i++) {
                    const k = argumentKeys[i];
                    txt += `"${constructor.arguments[k]}"`;
                    if (i !== argumentKeys.length - 1) {
                        txt += ", ";
                    }
                }
                return txt;
            })()}}`);
            tmpConstructorText = tmpConstructorText.replaceAll("%constructorimpl%", constructor.impl);
            constructorText += tmpConstructorText;
        }
        tmpClassText = tmpClassText.replaceAll("%constructordefs%", constructorText);


        var methodText = "";
        for (let i = 0; i < dataDump[className].methods.length; i++) {
            const method = dataDump[className].methods[i];
            var tmpMethodText = templateMethod;
            tmpMethodText = tmpMethodText.replaceAll("%classname%", className);
            tmpMethodText = tmpMethodText.replaceAll("%idx%", method.idx);
            tmpMethodText = tmpMethodText.replaceAll("%static%", method.isStatic);
            tmpMethodText = tmpMethodText.replaceAll("%methodname%", method.name);
            tmpMethodText = tmpMethodText.replaceAll("%returntype%", "\""+className+"\"");
            tmpMethodText = tmpMethodText.replaceAll("%argkeys%", `new String[]{${(()=>{
                var txt = "";
                var argumentKeys = Object.keys(method.arguments);
                for (let i = 0; i < argumentKeys.length; i++) {
                    const k = argumentKeys[i];
                    txt += `"${k}"`;
                    if (i !== argumentKeys.length - 1) {
                        txt += ", ";
                    }
                }
                return txt;
            })()}}`);
            tmpMethodText = tmpMethodText.replaceAll("%argvalues%", `new String[]{${(()=>{
                var txt = "";
                var argumentKeys = Object.keys(method.arguments);
                for (let i = 0; i < argumentKeys.length; i++) {
                    const k = argumentKeys[i];
                    txt += `"${method.arguments[k]}"`;
                    if (i !== argumentKeys.length - 1) {
                        txt += ", ";
                    }
                }
                return txt;
            })()}}`);
            tmpMethodText = tmpMethodText.replaceAll("%methodimpl%", method.impl);
            methodText += tmpMethodText;
        }

        tmpClassText = tmpClassText.replaceAll("%methoddefs%", methodText);

        classText += tmpClassText;
    }
    for (let i = 0; i < config.imports.length; i++) {
        manager = `import ${config.imports[i]}` + ";\n" + manager;
        logTxt(`Force imported classid: ${config.imports[i]}`);
    }

    if (config.attemptAutoImport) {
        for (let i = 0; i < imports.length; i++) {
            if (classIdMap.has(imports[i])) {
                manager = `import ${classIdMap.get(imports[i])}` + ";\n" + manager;
                logTxt(`Imported classid: ${classIdMap.get(imports[i])}`);
            }
        }
    }

    manager = `package ${config.managerFile.match(/(.*)(?=\.[^.]*$)/g)[0]}` + ";\n" + manager;

    manager = manager.replaceAll("%classdefs%", classText);

    zip.file(filePath, manager);
}
async function generate(fileList) {
    var classToLocationMap = new Map();
    var cfg;
    var output = new JSZip();
    const reader = new FileReader();
    var classDataDump = {};
    logClear();
    logTxt("[INIT] Build @ "+(new Date()));
    if (!fileList || fileList.length === 0) {
        logTxt("[ERROR] Filelist is empty.")
        return;
    }
    try {
        cfg = JSON.parse(document.querySelector("#config").value.trim());
    } catch (e) {
        logTxt("[ERROR] Invalid config.");
        return;
    }
    if (!cfg.targetFiles) {
        logTxt("[ERROR] Invalid config.");
    }
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.webkitRelativePath.endsWith(".java")) {
            var classId = file.webkitRelativePath.replaceAll("java/", "").replaceAll(".java", "").replaceAll("/", ".");
            var className = classId.split(".")[classId.split(".").length - 1];
            classToLocationMap.set(className, classId);
            if (cfg.targetFiles.includes(classId)) {
                logTxt("Found "+classId+" ["+file.name+"], processing...");
                var javaFileContent = await process(file, reader, classDataDump, className);
                if (cfg.includeReadFiles) {
                    output.file(file.webkitRelativePath.replaceAll("java/", ""), javaFileContent);
                }
            }
        }
    }
    logTxt(`Creating manager file...`);
    createManagerFile(templateManager, cfg, output, classDataDump, classToLocationMap);

    logTxt(`Writing log.txt...`);
    output.file("log.txt", document.querySelector("#logs").innerText);

    output.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, "patch.zip");
    });
}
window.addEventListener("load", ()=>{
    document.querySelector('#generate').addEventListener("click", ()=>{
        generate(document.querySelector('#data').files);
    });
    logClear();
    logTxt("//Upload the ./src/main/java folder and press generate to begin hook generation");
});