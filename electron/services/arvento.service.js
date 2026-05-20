const path = require('path')
const fs = require('fs')
const { app } = require('electron')

const settingsPath = path.join(app.getPath('userData'), 'settings.json')

function getArventoCredentials() {
    try {
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
            if (settings && settings.arvento) {
                return {
                    username: settings.arvento.username || '',
                    pin1: settings.arvento.pin1 || '',
                    pin2: settings.arvento.pin2 || '',
                    language: settings.arvento.language || 'tr',
                    enabled: !!settings.arvento.enabled
                }
            }
        }
    } catch (error) {
        console.error('Error loading Arvento credentials:', error)
    }
    return { username: '', pin1: '', pin2: '', language: 'tr', enabled: false }
}

function escapeXml(unsafe) {
    if (unsafe === undefined || unsafe === null) return ''
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;'
            case '>': return '&gt;'
            case '&': return '&amp;'
            case '\'': return '&apos;'
            case '"': return '&quot;'
            default: return c
        }
    })
}

function decodeXml(str) {
    if (!str) return ''
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
}

function extractResult(xml, methodName) {
    const tagName = `${methodName}Result`
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`)
    const match = xml.match(regex)
    if (!match) {
        // Fallback search with ignoring namespace prefix if any (e.g. <a:GetVehicleStatusJSONResult>)
        const namespaceRegex = new RegExp(`<[a-zA-Z0-9:]*${methodName}Result>([\\s\\S]*?)<\\/[a-zA-Z0-9:]*${methodName}Result>`)
        const namespaceMatch = xml.match(namespaceRegex)
        if (!namespaceMatch) {
            throw new Error(`XML element ${tagName} not found in response`)
        }
        return decodeXml(namespaceMatch[1])
    }
    return decodeXml(match[1])
}

function parseXmlTable(xml) {
    // Matches <Table> ... </Table> or similar rows
    const tableRegex = /<(Table|TableRow|Vehicle|Record|Mapping|tblPlaka)[\s>][\s\S]*?<\/\1>/g
    const matches = xml.match(tableRegex)
    if (!matches) {
        // Try finding direct children inside a list tag
        const listMatch = xml.match(/<[^>]+List>([\s\S]*?)<\/[^>]+List>/)
        if (listMatch) {
            const childRegex = /<([^>]+)>([\s\S]*?)<\/\1>/g
            const listItems = []
            let m
            while ((m = childRegex.exec(listMatch[1])) !== null) {
                listItems.push(m[2])
            }
            if (listItems.length > 0) {
                return listItems.map(itemXml => {
                    const fields = {}
                    const fieldRegex = /<([a-zA-Z0-9_:-]+)>([\s\S]*?)<\/\1>/g
                    let fm
                    while ((fm = fieldRegex.exec(itemXml)) !== null) {
                        const key = fm[1]
                            .replace(/_x0020_/g, ' ')
                            .replace(/_x0028_/g, '(')
                            .replace(/_x0029_/g, ')')
                        fields[key] = decodeXml(fm[2])
                    }
                    return fields
                })
            }
        }
        return []
    }

    return matches.map(rowXml => {
        const fields = {}
        const fieldRegex = /<([a-zA-Z0-9_:-]+)>([\s\S]*?)<\/\1>/g
        let match
        while ((match = fieldRegex.exec(rowXml)) !== null) {
            const key = match[1]
                .replace(/_x0020_/g, ' ')
                .replace(/_x0028_/g, '(')
                .replace(/_x0029_/g, ')')
            const val = decodeXml(match[2])
            fields[key] = val
        }
        return fields
    })
}

async function makeArventoRequest(methodName, params = {}, credentialsOverride = null) {
    const creds = credentialsOverride || getArventoCredentials()
    const username = creds.username
    const pin1 = creds.pin1
    const pin2 = creds.pin2
    const language = creds.language || 'tr'

    let methodParamsXml = `
      <Username>${escapeXml(username)}</Username>
      <PIN1>${escapeXml(pin1)}</PIN1>
      <PIN2>${escapeXml(pin2)}</PIN2>
      <Language>${escapeXml(language)}</Language>
    `

    for (const [key, value] of Object.entries(params)) {
        if (key !== 'Username' && key !== 'PIN1' && key !== 'PIN2' && key !== 'Language') {
            methodParamsXml += `<${key}>${escapeXml(value)}</${key}>\n`
        }
    }

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="http://www.arvento.com/">
      ${methodParamsXml}
    </${methodName}>
  </soap:Body>
</soap:Envelope>`

    const url = 'https://ws.arvento.com/v1/report.asmx'
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': `http://www.arvento.com/${methodName}`
        },
        body: soapEnvelope
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const xmlText = await response.text()
    return xmlText
}

async function getArventoData(methodName, params = {}, isJsonExplicit = null, credentialsOverride = null) {
    try {
        const xml = await makeArventoRequest(methodName, params, credentialsOverride)
        
        // Robust check for JSON inside the raw response (even if wrapped or prepended like Arvento does)
        let parsedJson = null
        const firstBracket = xml.indexOf('[')
        const lastBracket = xml.lastIndexOf(']')
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            const potentialJson = xml.substring(firstBracket, lastBracket + 1)
            try {
                parsedJson = JSON.parse(potentialJson)
            } catch (e) {}
        }
        
        if (!parsedJson) {
            const firstBrace = xml.indexOf('{')
            const lastBrace = xml.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const potentialJson = xml.substring(firstBrace, lastBrace + 1)
                try {
                    parsedJson = JSON.parse(potentialJson)
                } catch (e) {}
            }
        }
        
        if (parsedJson) {
            return { success: true, data: parsedJson }
        }

        // Fallback to XML table parsing
        let resultText
        try {
            resultText = extractResult(xml, methodName)
        } catch (e) {
            const data = parseXmlTable(xml)
            return { success: true, data }
        }

        const data = parseXmlTable(resultText)
        if (data.length === 0) {
            return { success: true, data: resultText.trim() }
        }
        return { success: true, data }
    } catch (error) {
        console.error(`Arvento error in ${methodName}:`, error)
        return { success: false, error: error.message }
    }
}

// Service Methods
async function testArventoConnection(credentials) {
    // Attempting GetVehicleStatusJSON is the best way to verify connection and credentials
    return await getArventoData('GetVehicleStatusJSON', {}, true, credentials)
}

async function getArventoVehicleStatus() {
    return await getArventoData('GetVehicleStatusJSON', {}, true)
}

async function getArventoLicensePlateNodeMappings() {
    return await getArventoData('GetLicensePlateNodeMappings', {}, false)
}

async function getArventoVehicleInfo() {
    return await getArventoData('GetVehicleInfo', {}, false)
}

async function getArventoVehicleDailyStatus(date) {
    // Format date if passed as object or string
    let dateStr = date
    if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0]
    }
    return await getArventoData('VehicleDailyStatusReport', { Date: dateStr }, false)
}

async function getArventoAlarms() {
    return await getArventoData('GetVehicleAlarmStatusJson', {}, true)
}

module.exports = {
    testArventoConnection,
    getArventoVehicleStatus,
    getArventoLicensePlateNodeMappings,
    getArventoVehicleInfo,
    getArventoVehicleDailyStatus,
    getArventoAlarms
}
