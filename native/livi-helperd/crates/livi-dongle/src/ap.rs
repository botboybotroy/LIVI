//! The dongle's access point, asked over its control port.

use std::io::{BufRead, BufReader, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use crate::link;

pub const PORT: u16 = 5001;
const TIMEOUT: Duration = Duration::from_secs(3);

/// One field of `status`, or None when the dongle does not answer.
pub fn status_field(key: &str) -> Option<String> {
    let addr = (link::LINK_NAME, PORT).to_socket_addrs().ok()?.next()?;
    let mut stream = TcpStream::connect_timeout(&addr, TIMEOUT).ok()?;
    stream.set_read_timeout(Some(TIMEOUT)).ok()?;
    stream.write_all(b"status\n").ok()?;
    let want = format!("{key} ");
    for line in BufReader::new(stream).lines().map_while(Result::ok) {
        if line == "ok" || line.starts_with("error") {
            break;
        }
        if let Some(value) = line.strip_prefix(&want) {
            return Some(value.trim().to_string());
        }
    }
    None
}

/// The MAC the phone is told to look for.
pub fn mac() -> Option<String> {
    status_field("mac")
}
